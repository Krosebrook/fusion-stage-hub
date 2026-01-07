import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

// Token bucket rate limiting configuration
// Global: 600 RPM (10 req/sec)
// Catalog: 100 RPM (~1.67 req/sec)
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

interface RateLimitState {
  global: TokenBucket;
  catalog: TokenBucket;
}

// Catalog endpoints that have stricter rate limits
const CATALOG_ENDPOINTS = [
  '/catalog/blueprints',
  '/catalog/print_providers',
  '/shops'
];

function isCatalogEndpoint(path: string): boolean {
  return CATALOG_ENDPOINTS.some(ep => path.startsWith(ep));
}

function createTokenBucket(capacity: number, refillRatePerMinute: number): TokenBucket {
  return {
    tokens: capacity,
    lastRefill: Date.now(),
    capacity,
    refillRate: refillRatePerMinute / 60 // Convert to per-second
  };
}

function refillBucket(bucket: TokenBucket): TokenBucket {
  const now = Date.now();
  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  const tokensToAdd = elapsedSeconds * bucket.refillRate;
  
  return {
    ...bucket,
    tokens: Math.min(bucket.capacity, bucket.tokens + tokensToAdd),
    lastRefill: now
  };
}

function tryConsumeToken(bucket: TokenBucket): { allowed: boolean; bucket: TokenBucket; waitTime: number } {
  const refreshedBucket = refillBucket(bucket);
  
  if (refreshedBucket.tokens >= 1) {
    return {
      allowed: true,
      bucket: { ...refreshedBucket, tokens: refreshedBucket.tokens - 1 },
      waitTime: 0
    };
  }
  
  // Calculate wait time until a token is available
  const tokensNeeded = 1 - refreshedBucket.tokens;
  const waitTimeSeconds = tokensNeeded / refreshedBucket.refillRate;
  
  return {
    allowed: false,
    bucket: refreshedBucket,
    waitTime: Math.ceil(waitTimeSeconds)
  };
}

function initializeRateLimitState(): RateLimitState {
  return {
    global: createTokenBucket(600, 600),   // 600 RPM global
    catalog: createTokenBucket(100, 100)   // 100 RPM catalog
  };
}

function parseRateLimitState(stored: unknown): RateLimitState {
  if (!stored || typeof stored !== 'object') {
    return initializeRateLimitState();
  }
  
  const state = stored as Record<string, unknown>;
  const defaultState = initializeRateLimitState();
  
  return {
    global: (state.global as TokenBucket) || defaultState.global,
    catalog: (state.catalog as TokenBucket) || defaultState.catalog
  };
}

interface PrintifyRequest {
  store_id: string;
  method?: string;
  path: string;
  body?: Record<string, unknown>;
  shop_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { store_id, method = 'GET', path, body, shop_id }: PrintifyRequest = await req.json();

    if (!store_id || !path) {
      return new Response(
        JSON.stringify({ error: 'store_id and path are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch store with credentials
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', store_id)
      .eq('platform', 'printify')
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: 'Store not found or not a Printify store' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check org membership
    const { data: isMember } = await supabase.rpc('is_org_member', {
      p_org_id: store.org_id,
      p_user_id: user.id
    });

    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current rate limit state
    let rateLimitState = parseRateLimitState(store.rate_limit_state);
    const isCatalog = isCatalogEndpoint(path);

    // Check global rate limit
    const globalCheck = tryConsumeToken(rateLimitState.global);
    if (!globalCheck.allowed) {
      // Log rate limit hit
      await supabase.from('audit_logs').insert({
        org_id: store.org_id,
        resource_type: 'store',
        resource_id: store_id,
        action: 'rate_limit_hit',
        metadata: { limit_type: 'global', path, wait_time: globalCheck.waitTime },
        soc2_tags: ['rate_limiting']
      });

      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded (global)', 
          retry_after: globalCheck.waitTime,
          limit_type: 'global'
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(globalCheck.waitTime)
          } 
        }
      );
    }
    rateLimitState.global = globalCheck.bucket;

    // Check catalog rate limit if applicable
    if (isCatalog) {
      const catalogCheck = tryConsumeToken(rateLimitState.catalog);
      if (!catalogCheck.allowed) {
        // Refund global token since we can't proceed
        rateLimitState.global.tokens = Math.min(
          rateLimitState.global.capacity,
          rateLimitState.global.tokens + 1
        );

        await supabase.from('audit_logs').insert({
          org_id: store.org_id,
          resource_type: 'store',
          resource_id: store_id,
          action: 'rate_limit_hit',
          metadata: { limit_type: 'catalog', path, wait_time: catalogCheck.waitTime },
          soc2_tags: ['rate_limiting']
        });

        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded (catalog)', 
            retry_after: catalogCheck.waitTime,
            limit_type: 'catalog'
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': String(catalogCheck.waitTime)
            } 
          }
        );
      }
      rateLimitState.catalog = catalogCheck.bucket;
    }

    // Get API token from credentials
    let apiToken: string;
    try {
      const credentials = JSON.parse(store.credentials_encrypted || '{}');
      apiToken = credentials.api_token;
      if (!apiToken) {
        throw new Error('API token not found');
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid store credentials' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the API URL
    let apiPath = path;
    if (shop_id && !path.includes('/shops/')) {
      apiPath = `/shops/${shop_id}${path}`;
    }
    const url = `${PRINTIFY_API_BASE}${apiPath}`;

    // Make the API request
    const apiResponse = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'FlashFusion/1.0'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    // Update rate limit state in database
    await supabase
      .from('stores')
      .update({ 
        rate_limit_state: rateLimitState as unknown as Record<string, unknown>,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', store_id);

    // Parse response
    const responseData = await apiResponse.json().catch(() => ({}));

    // Handle Printify rate limit headers if present
    const printifyRateLimit = apiResponse.headers.get('X-RateLimit-Remaining');
    const printifyRateLimitReset = apiResponse.headers.get('X-RateLimit-Reset');

    if (apiResponse.status === 429) {
      // Printify returned rate limit - sync our state
      const retryAfter = parseInt(apiResponse.headers.get('Retry-After') || '60');
      
      await supabase.from('audit_logs').insert({
        org_id: store.org_id,
        resource_type: 'store',
        resource_id: store_id,
        action: 'external_rate_limit',
        metadata: { path, retry_after: retryAfter },
        soc2_tags: ['rate_limiting', 'external_api']
      });

      return new Response(
        JSON.stringify({ 
          error: 'Printify rate limit exceeded', 
          retry_after: retryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter)
          } 
        }
      );
    }

    if (!apiResponse.ok) {
      await supabase.from('audit_logs').insert({
        org_id: store.org_id,
        resource_type: 'store',
        resource_id: store_id,
        action: 'api_error',
        metadata: { path, status: apiResponse.status, error: responseData },
        soc2_tags: ['api_error']
      });

      return new Response(
        JSON.stringify({ error: 'Printify API error', details: responseData }),
        { status: apiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful API call
    await supabase.from('audit_logs').insert({
      org_id: store.org_id,
      resource_type: 'store',
      resource_id: store_id,
      action: 'api_call',
      metadata: { 
        path, 
        method,
        rate_limit_remaining: printifyRateLimit,
        is_catalog: isCatalog
      },
      soc2_tags: ['api_call']
    });

    return new Response(
      JSON.stringify({ 
        data: responseData,
        rate_limits: {
          global_remaining: Math.floor(rateLimitState.global.tokens),
          catalog_remaining: Math.floor(rateLimitState.catalog.tokens)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
