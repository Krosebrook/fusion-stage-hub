import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReconciliationResult {
  platform: string;
  storeId: string;
  discrepancies: Discrepancy[];
  reconciledAt: string;
  status: "clean" | "discrepancies_found" | "error";
}

interface Discrepancy {
  type: "missing_local" | "missing_remote" | "data_mismatch" | "inventory_drift" | "price_drift";
  resourceType: "product" | "listing" | "inventory" | "order";
  localId?: string;
  remoteId?: string;
  localValue?: unknown;
  remoteValue?: unknown;
  severity: "low" | "medium" | "high" | "critical";
  suggestedAction: string;
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

    const { storeId, fullReconcile = false, resourceTypes = ["product", "listing", "inventory"] } = await req.json();

    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch store details
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*, orgs!inner(id)")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const discrepancies: Discrepancy[] = [];
    const platform = store.platform;

    // Fetch local data
    const { data: localListings } = await supabase
      .from("listings")
      .select("*, products(*)")
      .eq("store_id", storeId);

    // Platform-specific reconciliation
    switch (platform) {
      case "shopify":
        await reconcileShopify(store, localListings || [], discrepancies, fullReconcile);
        break;
      case "printify":
        await reconcilePrintify(store, localListings || [], discrepancies, fullReconcile);
        break;
      case "etsy":
        await reconcileEtsy(store, localListings || [], discrepancies, fullReconcile);
        break;
      case "amazon_sc":
      case "amazon_kdp":
        await reconcileAmazon(store, localListings || [], discrepancies, fullReconcile);
        break;
      case "gumroad":
        await reconcileGumroad(store, localListings || [], discrepancies, fullReconcile);
        break;
      default:
        // Generic reconciliation for unknown platforms
        await reconcileGeneric(store, localListings || [], discrepancies);
    }

    const result: ReconciliationResult = {
      platform,
      storeId,
      discrepancies,
      reconciledAt: new Date().toISOString(),
      status: discrepancies.length > 0 ? "discrepancies_found" : "clean",
    };

    // Create approval requests for high/critical discrepancies
    const criticalDiscrepancies = discrepancies.filter(
      (d) => d.severity === "high" || d.severity === "critical"
    );

    if (criticalDiscrepancies.length > 0) {
      await supabase.from("approvals").insert({
        org_id: store.org_id,
        resource_type: "reconciliation",
        resource_id: storeId,
        action: "resolve_discrepancies",
        payload: {
          discrepancies: criticalDiscrepancies,
          storeId,
          platform,
          reconciledAt: result.reconciledAt,
        },
        requested_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });
    }

    // Log audit event
    await supabase.from("audit_logs").insert({
      org_id: store.org_id,
      user_id: user.id,
      action: "reconciliation_run",
      resource_type: "store",
      resource_id: storeId,
      metadata: {
        platform,
        discrepancyCount: discrepancies.length,
        criticalCount: criticalDiscrepancies.length,
        fullReconcile,
        resourceTypes,
      },
      soc2_tags: ["data_integrity", "reconciliation"],
    });

    // Update store last_synced_at
    await supabase
      .from("stores")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", storeId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Reconciliation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Reconciliation failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function reconcileShopify(
  store: any,
  localListings: any[],
  discrepancies: Discrepancy[],
  fullReconcile: boolean
) {
  // Simulate fetching Shopify products via GraphQL
  // In production, this would call the shopify-graphql edge function
  const remoteProducts = await fetchShopifyProducts(store);

  // Build lookup maps
  const localByExternalId = new Map(
    localListings.filter((l) => l.external_id).map((l) => [l.external_id, l])
  );
  const remoteById = new Map(remoteProducts.map((p: any) => [p.id, p]));

  // Check for missing local entries
  for (const [remoteId, remote] of remoteById) {
    if (!localByExternalId.has(remoteId)) {
      discrepancies.push({
        type: "missing_local",
        resourceType: "listing",
        remoteId,
        remoteValue: { title: remote.title, status: remote.status },
        severity: "medium",
        suggestedAction: "Import product from Shopify",
      });
    }
  }

  // Check for missing remote entries and data mismatches
  for (const [externalId, local] of localByExternalId) {
    const remote = remoteById.get(externalId);
    if (!remote) {
      discrepancies.push({
        type: "missing_remote",
        resourceType: "listing",
        localId: local.id,
        localValue: { title: local.products?.title, status: local.status },
        severity: "high",
        suggestedAction: "Re-publish product to Shopify or remove local listing",
      });
      continue;
    }

    // Check inventory drift
    if (fullReconcile && remote.totalInventory !== undefined) {
      const localInventory = local.products?.variants?.[0]?.inventory_quantity || 0;
      if (Math.abs(remote.totalInventory - localInventory) > 5) {
        discrepancies.push({
          type: "inventory_drift",
          resourceType: "inventory",
          localId: local.id,
          remoteId: externalId,
          localValue: localInventory,
          remoteValue: remote.totalInventory,
          severity: Math.abs(remote.totalInventory - localInventory) > 50 ? "critical" : "medium",
          suggestedAction: "Sync inventory from Shopify",
        });
      }
    }

    // Check price drift
    if (remote.priceRange?.minVariantPrice?.amount) {
      const remotePrice = parseFloat(remote.priceRange.minVariantPrice.amount);
      const localPrice = local.price_override || local.products?.base_price || 0;
      if (Math.abs(remotePrice - localPrice) > 0.01) {
        discrepancies.push({
          type: "price_drift",
          resourceType: "listing",
          localId: local.id,
          remoteId: externalId,
          localValue: localPrice,
          remoteValue: remotePrice,
          severity: "low",
          suggestedAction: "Update local price to match Shopify",
        });
      }
    }
  }
}

async function reconcilePrintify(
  store: any,
  localListings: any[],
  discrepancies: Discrepancy[],
  fullReconcile: boolean
) {
  // Printify reconciliation logic
  // Similar pattern to Shopify but with Printify-specific fields
  const remoteProducts = await fetchPrintifyProducts(store);

  const localByExternalId = new Map(
    localListings.filter((l) => l.external_id).map((l) => [l.external_id, l])
  );

  for (const remote of remoteProducts) {
    const local = localByExternalId.get(remote.id);
    if (!local) {
      discrepancies.push({
        type: "missing_local",
        resourceType: "product",
        remoteId: remote.id,
        remoteValue: { title: remote.title },
        severity: "medium",
        suggestedAction: "Import product from Printify",
      });
    }
  }
}

async function reconcileEtsy(
  store: any,
  localListings: any[],
  discrepancies: Discrepancy[],
  fullReconcile: boolean
) {
  // Etsy reconciliation with eventual consistency awareness
  const remoteListings = await fetchEtsyListings(store);

  const localByExternalId = new Map(
    localListings.filter((l) => l.external_id).map((l) => [l.external_id, l])
  );

  for (const remote of remoteListings) {
    const local = localByExternalId.get(remote.listing_id?.toString());
    if (!local) {
      discrepancies.push({
        type: "missing_local",
        resourceType: "listing",
        remoteId: remote.listing_id?.toString(),
        remoteValue: { title: remote.title, state: remote.state },
        severity: "medium",
        suggestedAction: "Import listing from Etsy",
      });
    } else if (remote.state !== "active" && local.status === "published") {
      discrepancies.push({
        type: "data_mismatch",
        resourceType: "listing",
        localId: local.id,
        remoteId: remote.listing_id?.toString(),
        localValue: { status: local.status },
        remoteValue: { state: remote.state },
        severity: "high",
        suggestedAction: "Update local status to match Etsy",
      });
    }
  }
}

async function reconcileAmazon(
  store: any,
  localListings: any[],
  discrepancies: Discrepancy[],
  fullReconcile: boolean
) {
  // Amazon SP-API reconciliation
  // Amazon is eventually consistent, so we check feed submission results
  const feedResults = await fetchAmazonFeedResults(store);
  const inventoryReport = await fetchAmazonInventoryReport(store);

  // Check for feed processing errors
  for (const feed of feedResults) {
    if (feed.processingStatus === "FATAL" || feed.processingStatus === "CANCELLED") {
      discrepancies.push({
        type: "data_mismatch",
        resourceType: "listing",
        localId: feed.localListingId,
        remoteId: feed.feedId,
        localValue: { feedType: feed.feedType },
        remoteValue: { status: feed.processingStatus, errors: feed.errors },
        severity: "critical",
        suggestedAction: "Review feed errors and resubmit",
      });
    }
  }

  // Check inventory discrepancies
  for (const item of inventoryReport) {
    const local = localListings.find(
      (l) => l.external_id === item.sellerSku || l.products?.sku === item.sellerSku
    );
    if (local) {
      const localQty = local.products?.variants?.[0]?.inventory_quantity || 0;
      if (Math.abs(item.fulfillableQuantity - localQty) > 10) {
        discrepancies.push({
          type: "inventory_drift",
          resourceType: "inventory",
          localId: local.id,
          remoteId: item.sellerSku,
          localValue: localQty,
          remoteValue: item.fulfillableQuantity,
          severity: "high",
          suggestedAction: "Sync inventory from Amazon",
        });
      }
    }
  }
}

async function reconcileGumroad(
  store: any,
  localListings: any[],
  discrepancies: Discrepancy[],
  fullReconcile: boolean
) {
  // Gumroad is webhook-driven, so reconciliation focuses on
  // verifying webhook delivery and local state consistency
  const remoteProducts = await fetchGumroadProducts(store);

  const localByExternalId = new Map(
    localListings.filter((l) => l.external_id).map((l) => [l.external_id, l])
  );

  for (const remote of remoteProducts) {
    if (!localByExternalId.has(remote.id)) {
      discrepancies.push({
        type: "missing_local",
        resourceType: "product",
        remoteId: remote.id,
        remoteValue: { name: remote.name, published: remote.published },
        severity: "medium",
        suggestedAction: "Import product from Gumroad",
      });
    }
  }
}

async function reconcileGeneric(
  store: any,
  localListings: any[],
  discrepancies: Discrepancy[]
) {
  // Generic reconciliation for unknown platforms
  // Just log that reconciliation was attempted
  console.log(`Generic reconciliation for platform: ${store.platform}`);
}

// Mock external API fetch functions
// In production, these would make actual API calls
async function fetchShopifyProducts(store: any): Promise<any[]> {
  // Would call shopify-graphql edge function
  return [];
}

async function fetchPrintifyProducts(store: any): Promise<any[]> {
  // Would call printify-api edge function
  return [];
}

async function fetchEtsyListings(store: any): Promise<any[]> {
  // Would call etsy-api edge function
  return [];
}

async function fetchAmazonFeedResults(store: any): Promise<any[]> {
  // Would call amazon-sp-api edge function
  return [];
}

async function fetchAmazonInventoryReport(store: any): Promise<any[]> {
  // Would call amazon-sp-api edge function
  return [];
}

async function fetchGumroadProducts(store: any): Promise<any[]> {
  // Would fetch from Gumroad API
  return [];
}
