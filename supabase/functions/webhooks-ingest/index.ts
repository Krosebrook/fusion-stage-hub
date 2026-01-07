import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic, x-printify-signature, x-gumroad-signature, x-etsy-hmac-sha256',
};

// Crypto utilities for signature verification
async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Platform-specific signature verification
interface VerificationResult {
  valid: boolean;
  error?: string;
}

async function verifyShopifySignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<VerificationResult> {
  if (!signature) {
    return { valid: false, error: 'Missing Shopify signature' };
  }
  
  const computedSignature = await hmacSha256(secret, body);
  
  if (!timingSafeEqual(computedSignature, signature)) {
    return { valid: false, error: 'Invalid Shopify signature' };
  }
  
  return { valid: true };
}

async function verifyPrintifySignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<VerificationResult> {
  if (!signature) {
    return { valid: false, error: 'Missing Printify signature' };
  }
  
  const computedSignature = await hmacSha256(secret, body);
  
  if (!timingSafeEqual(computedSignature, signature)) {
    return { valid: false, error: 'Invalid Printify signature' };
  }
  
  return { valid: true };
}

async function verifyGumroadSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<VerificationResult> {
  if (!signature) {
    return { valid: false, error: 'Missing Gumroad signature' };
  }
  
  const computedSignature = await hmacSha256(secret, body);
  
  if (!timingSafeEqual(computedSignature, signature)) {
    return { valid: false, error: 'Invalid Gumroad signature' };
  }
  
  return { valid: true };
}

async function verifyEtsySignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<VerificationResult> {
  if (!signature) {
    return { valid: false, error: 'Missing Etsy signature' };
  }
  
  const computedSignature = await hmacSha256(secret, body);
  
  if (!timingSafeEqual(computedSignature, signature)) {
    return { valid: false, error: 'Invalid Etsy signature' };
  }
  
  return { valid: true };
}

// Normalize webhook payloads to common format
interface NormalizedEvent {
  event_type: string;
  resource_type: string;
  resource_id: string;
  action: string;
  data: Record<string, unknown>;
}

function normalizeShopifyEvent(topic: string, payload: Record<string, unknown>): NormalizedEvent {
  const [resource, action] = topic.split('/');
  return {
    event_type: topic,
    resource_type: resource,
    resource_id: String(payload.id || payload.admin_graphql_api_id || ''),
    action,
    data: payload
  };
}

function normalizePrintifyEvent(eventType: string, payload: Record<string, unknown>): NormalizedEvent {
  const parts = eventType.split(':');
  const resource = payload.resource as Record<string, unknown> | undefined;
  return {
    event_type: eventType,
    resource_type: parts[0] || 'unknown',
    resource_id: String(payload.id || resource?.id || ''),
    action: parts[1] || 'update',
    data: payload
  };
}

function normalizeGumroadEvent(eventType: string, payload: Record<string, unknown>): NormalizedEvent {
  return {
    event_type: eventType,
    resource_type: 'sale',
    resource_id: String(payload.sale_id || payload.subscription_id || ''),
    action: eventType.replace('gumroad_', ''),
    data: payload
  };
}

function normalizeEtsyEvent(eventType: string, payload: Record<string, unknown>): NormalizedEvent {
  return {
    event_type: eventType,
    resource_type: payload.type as string || 'unknown',
    resource_id: String(payload.listing_id || payload.receipt_id || payload.shop_id || ''),
    action: eventType,
    data: payload
  };
}

function normalizeAmazonEvent(eventType: string, payload: Record<string, unknown>): NormalizedEvent {
  return {
    event_type: eventType,
    resource_type: payload.notificationType as string || 'unknown',
    resource_id: String(payload.sellerId || ''),
    action: eventType,
    data: payload
  };
}

// Create job for processing webhook
function createJobPayload(platform: string, event: NormalizedEvent, storeId: string): Record<string, unknown> {
  return {
    platform,
    event_type: event.event_type,
    resource_type: event.resource_type,
    resource_id: event.resource_id,
    action: event.action,
    store_id: storeId,
    webhook_data: event.data
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const platform = pathParts[pathParts.length - 2] || 'unknown';
    const storeId = pathParts[pathParts.length - 1] || url.searchParams.get('store_id');

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'Missing store_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch store configuration
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: 'Store not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    let payload: Record<string, unknown>;
    
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = Object.fromEntries(new URLSearchParams(rawBody));
    }

    // Get webhook secret from store credentials
    let webhookSecret: string;
    try {
      const credentials = JSON.parse(store.credentials_encrypted || '{}');
      webhookSecret = credentials.webhook_secret || '';
    } catch {
      webhookSecret = '';
    }

    // Verify signature based on platform
    let verificationResult: VerificationResult = { valid: true };
    let eventType = '';
    let externalId = '';
    let normalizedEvent: NormalizedEvent;

    switch (platform.toLowerCase()) {
      case 'shopify': {
        const signature = req.headers.get('x-shopify-hmac-sha256');
        const topic = req.headers.get('x-shopify-topic') || '';
        eventType = topic;
        externalId = String(payload.id || '');
        
        if (webhookSecret) {
          verificationResult = await verifyShopifySignature(rawBody, signature, webhookSecret);
        }
        normalizedEvent = normalizeShopifyEvent(topic, payload);
        break;
      }
      
      case 'printify': {
        const signature = req.headers.get('x-printify-signature');
        eventType = String(payload.type || payload.event || 'unknown');
        const printifyResource = payload.resource as Record<string, unknown> | undefined;
        externalId = String(payload.id || printifyResource?.id || '');
        
        if (webhookSecret) {
          verificationResult = await verifyPrintifySignature(rawBody, signature, webhookSecret);
        }
        normalizedEvent = normalizePrintifyEvent(eventType, payload);
        break;
      }
      
      case 'gumroad': {
        const signature = req.headers.get('x-gumroad-signature');
        eventType = String(payload.resource_name || 'sale');
        externalId = String(payload.sale_id || payload.subscription_id || '');
        
        if (webhookSecret) {
          verificationResult = await verifyGumroadSignature(rawBody, signature, webhookSecret);
        }
        normalizedEvent = normalizeGumroadEvent(eventType, payload);
        break;
      }
      
      case 'etsy': {
        const signature = req.headers.get('x-etsy-hmac-sha256');
        eventType = String(payload.type || 'unknown');
        externalId = String(payload.listing_id || payload.receipt_id || '');
        
        if (webhookSecret) {
          verificationResult = await verifyEtsySignature(rawBody, signature, webhookSecret);
        }
        normalizedEvent = normalizeEtsyEvent(eventType, payload);
        break;
      }
      
      case 'amazon':
      case 'amazon-sp':
      case 'amazon-kdp': {
        // Amazon uses different auth mechanisms (SQS, SNS)
        eventType = String(payload.notificationType || payload.EventType || 'unknown');
        externalId = String(payload.EventId || payload.notificationId || '');
        normalizedEvent = normalizeAmazonEvent(eventType, payload);
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ error: `Unsupported platform: ${platform}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Check signature verification result
    if (!verificationResult.valid) {
      await supabase.from('audit_logs').insert({
        org_id: store.org_id,
        resource_type: 'webhook',
        resource_id: storeId,
        action: 'signature_verification_failed',
        metadata: { platform, error: verificationResult.error },
        soc2_tags: ['security', 'webhook', 'verification_failed']
      });

      return new Response(
        JSON.stringify({ error: verificationResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Replay protection: check if we've already processed this event
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id, status')
      .eq('store_id', storeId)
      .eq('external_id', externalId)
      .eq('event_type', eventType)
      .maybeSingle();

    if (existingEvent) {
      // Already processed - return success to prevent retries
      await supabase.from('audit_logs').insert({
        org_id: store.org_id,
        resource_type: 'webhook',
        resource_id: existingEvent.id,
        action: 'replay_detected',
        metadata: { platform, event_type: eventType, external_id: externalId },
        soc2_tags: ['security', 'webhook', 'replay_protection']
      });

      return new Response(
        JSON.stringify({ 
          status: 'already_processed',
          webhook_id: existingEvent.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert webhook event record
    const { data: webhookEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        store_id: storeId,
        external_id: externalId,
        event_type: eventType,
        payload: payload,
        signature: req.headers.get(`x-${platform}-hmac-sha256`) || 
                   req.headers.get(`x-${platform}-signature`) || null,
        status: 'received'
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to store webhook: ${insertError.message}`);
    }

    // Update status to processing
    await supabase
      .from('webhook_events')
      .update({ status: 'processing' })
      .eq('id', webhookEvent.id);

    // Enqueue job for processing
    const idempotencyKey = `webhook_${platform}_${storeId}_${externalId}_${eventType}`;
    const jobPayload = createJobPayload(platform, normalizedEvent, storeId);

    const { error: jobError } = await supabase
      .from('jobs')
      .insert({
        org_id: store.org_id,
        store_id: storeId,
        job_type: `webhook_${platform}`,
        idempotency_key: idempotencyKey,
        payload: jobPayload,
        priority: 10 // High priority for webhooks
      });

    if (jobError) {
      // Log but don't fail - webhook was received
      console.error('Failed to enqueue job:', jobError);
    }

    // Update webhook status
    await supabase
      .from('webhook_events')
      .update({ 
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('id', webhookEvent.id);

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: store.org_id,
      resource_type: 'webhook',
      resource_id: webhookEvent.id,
      action: 'webhook_received',
      metadata: { 
        platform, 
        event_type: eventType,
        external_id: externalId,
        normalized_resource: normalizedEvent.resource_type
      },
      soc2_tags: ['webhook', 'data_ingestion']
    });

    return new Response(
      JSON.stringify({ 
        status: 'received',
        webhook_id: webhookEvent.id,
        event_type: eventType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Webhook ingestion error:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
