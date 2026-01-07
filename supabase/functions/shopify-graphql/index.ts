import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shopify GraphQL cost limits
const SHOPIFY_BUCKET_SIZE = 1000;
const SHOPIFY_RESTORE_RATE = 50; // points per second
const COST_THRESHOLD_RATIO = 0.8; // Throttle when 80% consumed

interface ShopifyRateLimitState {
  currentlyAvailable: number;
  maximumAvailable: number;
  restoreRate: number;
  lastUpdated: string;
}

interface QueryCostResult {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: {
    maximumAvailable: number;
    currentlyAvailable: number;
    restoreRate: number;
  };
}

// Query slimming: Remove unnecessary fields to reduce cost
function slimQuery(query: string, requiredFields: string[] = []): string {
  // Remove comments
  let slimmed = query.replace(/#.*$/gm, "");
  
  // Remove excessive whitespace
  slimmed = slimmed.replace(/\s+/g, " ").trim();
  
  // Remove __typename if not needed
  if (!requiredFields.includes("__typename")) {
    slimmed = slimmed.replace(/__typename\s*/g, "");
  }
  
  // Remove pageInfo if cursor pagination not used
  if (!query.includes("after:") && !query.includes("before:")) {
    slimmed = slimmed.replace(/pageInfo\s*\{[^}]*\}/g, "");
  }
  
  return slimmed;
}

// Calculate estimated query cost based on Shopify's cost model
function estimateQueryCost(query: string): number {
  let cost = 1; // Base cost
  
  // Count connection fields (first/last arguments)
  const firstMatches = query.match(/first:\s*(\d+)/g) || [];
  const lastMatches = query.match(/last:\s*(\d+)/g) || [];
  
  for (const match of [...firstMatches, ...lastMatches]) {
    const num = parseInt(match.replace(/\D/g, ""));
    cost += Math.ceil(num / 100) * 2; // Rough estimate: 2 points per 100 items
  }
  
  // Add cost for nested connections
  const nestedConnections = (query.match(/edges\s*\{/g) || []).length;
  cost += nestedConnections * 2;
  
  return cost;
}

// Build optimized product query with only needed fields
function buildProductsQuery(
  first: number = 50,
  cursor?: string,
  fields: string[] = ["id", "title", "status", "variants"]
): string {
  const fieldMap: Record<string, string> = {
    id: "id",
    title: "title",
    handle: "handle",
    status: "status",
    vendor: "vendor",
    productType: "productType",
    description: "description",
    descriptionHtml: "descriptionHtml",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    publishedAt: "publishedAt",
    variants: `variants(first: 10) {
      edges {
        node {
          id
          title
          sku
          price
          inventoryQuantity
        }
      }
    }`,
    images: `images(first: 5) {
      edges {
        node {
          id
          url
          altText
        }
      }
    }`,
  };

  const selectedFields = fields
    .filter((f) => fieldMap[f])
    .map((f) => fieldMap[f])
    .join("\n          ");

  const afterClause = cursor ? `, after: "${cursor}"` : "";

  return `{
    products(first: ${first}${afterClause}) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ${selectedFields}
        }
      }
    }
  }`;
}

// Execute Shopify GraphQL with rate limit handling
async function executeShopifyQuery(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<{ data: unknown; cost: QueryCostResult; throttled: boolean }> {
  // Wrap query to include cost extension
  const wrappedQuery = query.includes("extensions")
    ? query
    : query.replace(
        /^(\s*\{)/,
        `{
    # Get cost information
  `
      );

  const response = await fetch(
    `https://${shopDomain}/admin/api/2024-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: wrappedQuery,
        variables,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  // Extract cost from extensions
  const cost: QueryCostResult = result.extensions?.cost || {
    requestedQueryCost: estimateQueryCost(query),
    actualQueryCost: estimateQueryCost(query),
    throttleStatus: {
      maximumAvailable: SHOPIFY_BUCKET_SIZE,
      currentlyAvailable: SHOPIFY_BUCKET_SIZE,
      restoreRate: SHOPIFY_RESTORE_RATE,
    },
  };

  const throttled =
    cost.throttleStatus.currentlyAvailable <
    cost.throttleStatus.maximumAvailable * (1 - COST_THRESHOLD_RATIO);

  return { data: result.data, cost, throttled };
}

// Calculate wait time based on cost and available budget
function calculateWaitTime(
  requiredCost: number,
  currentlyAvailable: number,
  restoreRate: number
): number {
  if (currentlyAvailable >= requiredCost) return 0;
  const deficit = requiredCost - currentlyAvailable;
  return Math.ceil((deficit / restoreRate) * 1000); // milliseconds
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, storeId, query, variables, fields, first, cursor } =
      await req.json();

    // Get store credentials
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .eq("platform", "shopify")
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: "Store not found or not Shopify" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse rate limit state
    const rateLimitState: ShopifyRateLimitState = store.rate_limit_state || {
      currentlyAvailable: SHOPIFY_BUCKET_SIZE,
      maximumAvailable: SHOPIFY_BUCKET_SIZE,
      restoreRate: SHOPIFY_RESTORE_RATE,
      lastUpdated: new Date().toISOString(),
    };

    // Restore points based on time elapsed
    const elapsed =
      (Date.now() - new Date(rateLimitState.lastUpdated).getTime()) / 1000;
    const restored = Math.min(
      elapsed * rateLimitState.restoreRate,
      rateLimitState.maximumAvailable - rateLimitState.currentlyAvailable
    );
    rateLimitState.currentlyAvailable = Math.min(
      rateLimitState.currentlyAvailable + restored,
      rateLimitState.maximumAvailable
    );

    // Decrypt credentials (simplified - in production use vault)
    const credentials = JSON.parse(store.credentials_encrypted || "{}");
    const { shopDomain, accessToken } = credentials;

    if (!shopDomain || !accessToken) {
      return new Response(
        JSON.stringify({ error: "Store credentials not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let finalQuery: string;
    let estimatedCost: number;

    switch (action) {
      case "products": {
        // Build optimized product query
        finalQuery = buildProductsQuery(first || 50, cursor, fields);
        estimatedCost = estimateQueryCost(finalQuery);
        break;
      }
      case "custom": {
        // Slim the provided query
        finalQuery = slimQuery(query);
        estimatedCost = estimateQueryCost(finalQuery);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Check if we need to wait for rate limit
    const waitTime = calculateWaitTime(
      estimatedCost,
      rateLimitState.currentlyAvailable,
      rateLimitState.restoreRate
    );

    if (waitTime > 0) {
      // Return throttle response with retry-after
      return new Response(
        JSON.stringify({
          error: "Rate limited",
          retryAfter: Math.ceil(waitTime / 1000),
          currentlyAvailable: rateLimitState.currentlyAvailable,
          requiredCost: estimatedCost,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(waitTime / 1000)),
          },
        }
      );
    }

    // Execute query
    const { data, cost, throttled } = await executeShopifyQuery(
      shopDomain,
      accessToken,
      finalQuery,
      variables
    );

    // Update rate limit state
    const newRateLimitState: ShopifyRateLimitState = {
      currentlyAvailable: cost.throttleStatus.currentlyAvailable,
      maximumAvailable: cost.throttleStatus.maximumAvailable,
      restoreRate: cost.throttleStatus.restoreRate,
      lastUpdated: new Date().toISOString(),
    };

    // Save updated rate limit state
    await supabase
      .from("stores")
      .update({ rate_limit_state: newRateLimitState })
      .eq("id", storeId);

    return new Response(
      JSON.stringify({
        data,
        cost: {
          requested: cost.requestedQueryCost,
          actual: cost.actualQueryCost,
          available: cost.throttleStatus.currentlyAvailable,
          maximum: cost.throttleStatus.maximumAvailable,
        },
        throttled,
        query: finalQuery, // Return slimmed query for debugging
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Shopify GraphQL error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
