import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Amazon SP-API endpoints
const AMAZON_REGIONS: Record<string, string> = {
  na: "https://sellingpartnerapi-na.amazon.com",
  eu: "https://sellingpartnerapi-eu.amazon.com",
  fe: "https://sellingpartnerapi-fe.amazon.com",
};

interface FeedSubmission {
  feedId: string;
  feedType: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "FATAL";
  submittedAt: string;
  completedAt?: string;
  resultDocumentId?: string;
}

interface AsyncFeedRequest {
  type: "CREATE_FEED" | "GET_FEED" | "GET_FEED_DOCUMENT" | "LIST_FEEDS";
  feedType?: string;
  feedId?: string;
  documentId?: string;
  content?: string;
  contentType?: string;
  marketplaceIds?: string[];
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

    const { storeId, operation, params }: { 
      storeId: string; 
      operation: string; 
      params: AsyncFeedRequest | Record<string, unknown>;
    } = await req.json();

    if (!storeId || !operation) {
      return new Response(
        JSON.stringify({ error: "storeId and operation required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch store
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .in("platform", ["amazon_sc", "amazon_kdp"])
      .single();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "Amazon store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const region = store.settings?.region || "na";
    const baseUrl = AMAZON_REGIONS[region];

    // Get LWA access token
    const accessToken = await getAccessToken(store);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Failed to get Amazon access token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;

    switch (operation) {
      case "createFeed":
        result = await createFeed(baseUrl, accessToken, params as AsyncFeedRequest, store, supabase);
        break;

      case "getFeed":
        result = await getFeed(baseUrl, accessToken, params as AsyncFeedRequest);
        break;

      case "getFeedDocument":
        result = await getFeedDocument(baseUrl, accessToken, params as AsyncFeedRequest);
        break;

      case "listFeeds":
        result = await listFeeds(baseUrl, accessToken, params as AsyncFeedRequest);
        break;

      case "getInventorySummaries":
        result = await getInventorySummaries(baseUrl, accessToken, params);
        break;

      case "getOrders":
        result = await getOrders(baseUrl, accessToken, params);
        break;

      case "submitReconciliation":
        result = await submitReconciliation(baseUrl, accessToken, params, store, supabase, user.id);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // Log API call for audit
    await supabase.from("audit_logs").insert({
      org_id: store.org_id,
      user_id: user.id,
      action: "amazon_sp_api_call",
      resource_type: "store",
      resource_id: storeId,
      metadata: {
        operation,
        region,
        success: !result.error,
      },
      soc2_tags: ["api_access", "amazon"],
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Amazon SP-API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Amazon SP-API request failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getAccessToken(store: any): Promise<string | null> {
  // In production, implement LWA token refresh flow
  // 1. Check if current token is expired
  // 2. If expired, use refresh_token to get new access_token
  // 3. Store new tokens back to store.credentials_encrypted

  const lwaClientId = Deno.env.get("AMAZON_LWA_CLIENT_ID");
  const lwaClientSecret = Deno.env.get("AMAZON_LWA_CLIENT_SECRET");

  if (!lwaClientId || !lwaClientSecret) {
    console.error("Amazon LWA credentials not configured");
    return null;
  }

  // Simplified - would decrypt and check token expiry
  const credentials = store.credentials_encrypted;
  if (!credentials) return null;

  // Return existing token or refresh if needed
  return credentials; // Simplified
}

async function createFeed(
  baseUrl: string,
  accessToken: string,
  params: AsyncFeedRequest,
  store: any,
  supabase: any
): Promise<any> {
  const { feedType, content, contentType, marketplaceIds } = params;

  if (!feedType || !content) {
    return { error: "feedType and content required" };
  }

  // Step 1: Create feed document
  const createDocResponse = await fetch(`${baseUrl}/feeds/2021-06-30/documents`, {
    method: "POST",
    headers: {
      "x-amz-access-token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contentType: contentType || "text/xml; charset=UTF-8",
    }),
  });

  if (!createDocResponse.ok) {
    const error = await createDocResponse.json();
    return { error: "Failed to create feed document", details: error };
  }

  const docData = await createDocResponse.json();

  // Step 2: Upload content to the document URL
  const uploadResponse = await fetch(docData.url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType || "text/xml; charset=UTF-8",
    },
    body: content,
  });

  if (!uploadResponse.ok) {
    return { error: "Failed to upload feed content" };
  }

  // Step 3: Create the feed
  const createFeedResponse = await fetch(`${baseUrl}/feeds/2021-06-30/feeds`, {
    method: "POST",
    headers: {
      "x-amz-access-token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      feedType,
      marketplaceIds: marketplaceIds || [store.settings?.marketplaceId || "ATVPDKIKX0DER"],
      inputFeedDocumentId: docData.feedDocumentId,
    }),
  });

  if (!createFeedResponse.ok) {
    const error = await createFeedResponse.json();
    return { error: "Failed to create feed", details: error };
  }

  const feedData = await createFeedResponse.json();

  // Enqueue a job to check feed status
  await supabase.from("jobs").insert({
    org_id: store.org_id,
    store_id: store.id,
    job_type: "amazon_feed_status_check",
    idempotency_key: `feed_check_${feedData.feedId}_${Date.now()}`,
    payload: {
      feedId: feedData.feedId,
      feedType,
      storeId: store.id,
    },
    scheduled_at: new Date(Date.now() + 60000).toISOString(), // Check in 1 minute
    priority: 5,
  });

  return {
    feedId: feedData.feedId,
    feedDocumentId: docData.feedDocumentId,
    status: "IN_QUEUE",
    message: "Feed submitted. Status will be checked automatically.",
  };
}

async function getFeed(baseUrl: string, accessToken: string, params: AsyncFeedRequest): Promise<any> {
  const { feedId } = params;
  if (!feedId) {
    return { error: "feedId required" };
  }

  const response = await fetch(`${baseUrl}/feeds/2021-06-30/feeds/${feedId}`, {
    headers: {
      "x-amz-access-token": accessToken,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    return { error: "Failed to get feed", details: error };
  }

  return await response.json();
}

async function getFeedDocument(baseUrl: string, accessToken: string, params: AsyncFeedRequest): Promise<any> {
  const { documentId } = params;
  if (!documentId) {
    return { error: "documentId required" };
  }

  const response = await fetch(`${baseUrl}/feeds/2021-06-30/documents/${documentId}`, {
    headers: {
      "x-amz-access-token": accessToken,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    return { error: "Failed to get feed document", details: error };
  }

  const docInfo = await response.json();

  // Download the actual document content
  const docResponse = await fetch(docInfo.url);
  if (!docResponse.ok) {
    return { error: "Failed to download feed document content" };
  }

  const content = await docResponse.text();

  return {
    ...docInfo,
    content,
  };
}

async function listFeeds(baseUrl: string, accessToken: string, params: AsyncFeedRequest): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params.feedType) {
    queryParams.append("feedTypes", params.feedType);
  }
  queryParams.append("pageSize", "20");

  const response = await fetch(`${baseUrl}/feeds/2021-06-30/feeds?${queryParams}`, {
    headers: {
      "x-amz-access-token": accessToken,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    return { error: "Failed to list feeds", details: error };
  }

  return await response.json();
}

async function getInventorySummaries(baseUrl: string, accessToken: string, params: any): Promise<any> {
  const queryParams = new URLSearchParams({
    granularityType: "Marketplace",
    granularityId: params.marketplaceId || "ATVPDKIKX0DER",
    marketplaceIds: params.marketplaceId || "ATVPDKIKX0DER",
  });

  if (params.sellerSkus) {
    queryParams.append("sellerSkus", params.sellerSkus.join(","));
  }

  const response = await fetch(
    `${baseUrl}/fba/inventory/v1/summaries?${queryParams}`,
    {
      headers: {
        "x-amz-access-token": accessToken,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    return { error: "Failed to get inventory summaries", details: error };
  }

  return await response.json();
}

async function getOrders(baseUrl: string, accessToken: string, params: any): Promise<any> {
  const queryParams = new URLSearchParams({
    MarketplaceIds: params.marketplaceId || "ATVPDKIKX0DER",
  });

  if (params.createdAfter) {
    queryParams.append("CreatedAfter", params.createdAfter);
  }
  if (params.orderStatuses) {
    queryParams.append("OrderStatuses", params.orderStatuses.join(","));
  }

  const response = await fetch(`${baseUrl}/orders/v0/orders?${queryParams}`, {
    headers: {
      "x-amz-access-token": accessToken,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    return { error: "Failed to get orders", details: error };
  }

  return await response.json();
}

async function submitReconciliation(
  baseUrl: string,
  accessToken: string,
  params: any,
  store: any,
  supabase: any,
  userId: string
): Promise<any> {
  // Fetch current inventory from Amazon
  const inventoryResult = await getInventorySummaries(baseUrl, accessToken, {
    marketplaceId: store.settings?.marketplaceId,
  });

  if (inventoryResult.error) {
    return inventoryResult;
  }

  // Fetch local listings for this store
  const { data: localListings } = await supabase
    .from("listings")
    .select("*, products(*)")
    .eq("store_id", store.id);

  // Compare and find discrepancies
  const discrepancies: any[] = [];
  const inventoryItems = inventoryResult.inventorySummaries || [];

  for (const item of inventoryItems) {
    const local = localListings?.find(
      (l: any) => l.external_id === item.sellerSku || l.products?.sku === item.sellerSku
    );

    if (local) {
      const localQty = local.products?.variants?.[0]?.inventory_quantity || 0;
      const amazonQty = item.inventoryDetails?.fulfillableQuantity || 0;

      if (Math.abs(amazonQty - localQty) > 5) {
        discrepancies.push({
          type: "inventory_drift",
          sku: item.sellerSku,
          localQuantity: localQty,
          amazonQuantity: amazonQty,
          difference: amazonQty - localQty,
        });
      }
    } else {
      discrepancies.push({
        type: "missing_local",
        sku: item.sellerSku,
        amazonQuantity: item.inventoryDetails?.fulfillableQuantity || 0,
      });
    }
  }

  // If discrepancies found, create approval request
  if (discrepancies.length > 0) {
    await supabase.from("approvals").insert({
      org_id: store.org_id,
      resource_type: "reconciliation",
      resource_id: store.id,
      action: "amazon_inventory_sync",
      payload: {
        discrepancies,
        storeId: store.id,
        reconciledAt: new Date().toISOString(),
      },
      requested_by: userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return {
    success: true,
    discrepanciesFound: discrepancies.length,
    discrepancies,
    message: discrepancies.length > 0
      ? "Discrepancies found. Approval request created for review."
      : "No discrepancies found. Inventory is in sync.",
  };
}
