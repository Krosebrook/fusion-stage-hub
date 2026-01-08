import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Etsy rate limits: 10 QPS, 10,000 QPD
const ETSY_QPS_LIMIT = 10;
const ETSY_QPD_LIMIT = 10000;
const ETSY_API_BASE = "https://openapi.etsy.com/v3";

interface RateLimitState {
  qps: {
    tokens: number;
    lastRefill: number;
  };
  daily: {
    count: number;
    resetAt: number;
  };
}

function getDefaultRateLimitState(): RateLimitState {
  const now = Date.now();
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);

  return {
    qps: {
      tokens: ETSY_QPS_LIMIT,
      lastRefill: now,
    },
    daily: {
      count: 0,
      resetAt: tomorrow.getTime(),
    },
  };
}

function refillQpsTokens(state: RateLimitState): RateLimitState {
  const now = Date.now();
  const elapsed = now - state.qps.lastRefill;
  const tokensToAdd = Math.floor(elapsed / 1000) * ETSY_QPS_LIMIT;

  if (tokensToAdd > 0) {
    state.qps.tokens = Math.min(ETSY_QPS_LIMIT, state.qps.tokens + tokensToAdd);
    state.qps.lastRefill = now;
  }

  return state;
}

function resetDailyIfNeeded(state: RateLimitState): RateLimitState {
  const now = Date.now();
  if (now >= state.daily.resetAt) {
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    state.daily = {
      count: 0,
      resetAt: tomorrow.getTime(),
    };
  }
  return state;
}

function canMakeRequest(state: RateLimitState): { allowed: boolean; waitMs?: number; reason?: string } {
  // Check daily limit
  if (state.daily.count >= ETSY_QPD_LIMIT) {
    const waitMs = state.daily.resetAt - Date.now();
    return {
      allowed: false,
      waitMs,
      reason: `Daily limit reached (${ETSY_QPD_LIMIT} QPD). Resets at midnight UTC.`,
    };
  }

  // Check QPS limit
  if (state.qps.tokens < 1) {
    const waitMs = Math.ceil((1 - state.qps.tokens) * 1000 / ETSY_QPS_LIMIT);
    return {
      allowed: false,
      waitMs,
      reason: `QPS limit reached (${ETSY_QPS_LIMIT} QPS). Wait ${waitMs}ms.`,
    };
  }

  return { allowed: true };
}

function consumeRequest(state: RateLimitState): RateLimitState {
  state.qps.tokens -= 1;
  state.daily.count += 1;
  return state;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storeId, endpoint, method = "GET", body } = await req.json();

    if (!storeId || !endpoint) {
      return new Response(
        JSON.stringify({ error: "storeId and endpoint required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch store with rate limit state
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .eq("platform", "etsy")
      .single();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "Etsy store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse rate limit state
    let rateLimitState: RateLimitState = store.rate_limit_state?.etsy || getDefaultRateLimitState();
    rateLimitState = refillQpsTokens(rateLimitState);
    rateLimitState = resetDailyIfNeeded(rateLimitState);

    // Check if we can make the request
    const checkResult = canMakeRequest(rateLimitState);
    if (!checkResult.allowed) {
      // Save updated state
      await supabase
        .from("stores")
        .update({
          rate_limit_state: {
            ...store.rate_limit_state,
            etsy: rateLimitState,
          },
        })
        .eq("id", storeId);

      return new Response(
        JSON.stringify({
          error: "Rate limited",
          reason: checkResult.reason,
          retryAfter: Math.ceil((checkResult.waitMs || 1000) / 1000),
          dailyRemaining: ETSY_QPD_LIMIT - rateLimitState.daily.count,
          dailyResetAt: new Date(rateLimitState.daily.resetAt).toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": Math.ceil((checkResult.waitMs || 1000) / 1000).toString(),
            "X-RateLimit-Remaining-Daily": (ETSY_QPD_LIMIT - rateLimitState.daily.count).toString(),
            "X-RateLimit-Reset-Daily": new Date(rateLimitState.daily.resetAt).toISOString(),
          },
        }
      );
    }

    // Consume a request token
    rateLimitState = consumeRequest(rateLimitState);

    // Get Etsy API key from environment
    const etsyApiKey = Deno.env.get("ETSY_API_KEY");
    if (!etsyApiKey) {
      return new Response(
        JSON.stringify({ error: "Etsy API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Decrypt store credentials for access token
    // In production, use proper decryption
    const accessToken = store.credentials_encrypted; // Simplified - would decrypt

    // Make the API request
    const url = `${ETSY_API_BASE}${endpoint}`;
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "x-api-key": etsyApiKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    // Handle Etsy-specific rate limit headers
    const etsyRateLimit = response.headers.get("X-RateLimit-Limit");
    const etsyRateRemaining = response.headers.get("X-RateLimit-Remaining");

    if (etsyRateRemaining) {
      const remaining = parseInt(etsyRateRemaining, 10);
      // Sync our daily count with Etsy's if they report it
      if (!isNaN(remaining) && remaining < ETSY_QPD_LIMIT - rateLimitState.daily.count) {
        rateLimitState.daily.count = ETSY_QPD_LIMIT - remaining;
      }
    }

    // Save updated rate limit state
    await supabase
      .from("stores")
      .update({
        rate_limit_state: {
          ...store.rate_limit_state,
          etsy: rateLimitState,
        },
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", storeId);

    const data = await response.json();

    // Log API call for audit
    await supabase.from("audit_logs").insert({
      org_id: store.org_id,
      user_id: user.id,
      action: "etsy_api_call",
      resource_type: "store",
      resource_id: storeId,
      metadata: {
        endpoint,
        method,
        statusCode: response.status,
        dailyRemaining: ETSY_QPD_LIMIT - rateLimitState.daily.count,
        qpsRemaining: rateLimitState.qps.tokens,
      },
      soc2_tags: ["api_access", "etsy"],
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error || "Etsy API error", details: data }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Remaining-Daily": (ETSY_QPD_LIMIT - rateLimitState.daily.count).toString(),
        },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RateLimit-Remaining-Daily": (ETSY_QPD_LIMIT - rateLimitState.daily.count).toString(),
        "X-RateLimit-Remaining-QPS": Math.floor(rateLimitState.qps.tokens).toString(),
      },
    });
  } catch (error: unknown) {
    console.error("Etsy API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Etsy API request failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
