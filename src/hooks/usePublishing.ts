import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Product = Tables<"products">;
type Store = Tables<"stores">;
type Listing = Tables<"listings">;

interface PlatformValidation {
  platform: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Platform-specific validation rules
const platformValidators: Record<
  string,
  (product: Product, store: Store) => PlatformValidation
> = {
  shopify: (product, store) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!product.title || product.title.length < 3) {
      errors.push("Title must be at least 3 characters");
    }
    if (product.title && product.title.length > 255) {
      errors.push("Title must not exceed 255 characters");
    }
    if (!product.base_price || product.base_price <= 0) {
      errors.push("Price must be greater than 0");
    }
    if (!product.description) {
      warnings.push("Description is recommended for better SEO");
    }

    return {
      platform: "Shopify",
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
  etsy: (product, store) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!product.title || product.title.length < 3) {
      errors.push("Title must be at least 3 characters");
    }
    if (product.title && product.title.length > 140) {
      errors.push("Title must not exceed 140 characters for Etsy");
    }
    if (!product.base_price || product.base_price < 0.2) {
      errors.push("Minimum price on Etsy is $0.20");
    }
    if (!product.description || product.description.length < 50) {
      errors.push("Description must be at least 50 characters for Etsy");
    }

    return {
      platform: "Etsy",
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
  printify: (product, store) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!product.sku) {
      errors.push("SKU is required for Printify");
    }
    if (!product.title) {
      errors.push("Title is required");
    }

    return {
      platform: "Printify",
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
  amazon: (product, store) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!product.sku) {
      errors.push("SKU is required for Amazon");
    }
    if (!product.title || product.title.length > 200) {
      errors.push("Title must not exceed 200 characters for Amazon");
    }
    if (!product.base_price) {
      errors.push("Price is required");
    }
    if (!product.description) {
      errors.push("Description is required for Amazon listings");
    }

    return {
      platform: "Amazon",
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
  gumroad: (product, store) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!product.title) {
      errors.push("Title is required");
    }
    if (!product.base_price || product.base_price < 0) {
      errors.push("Price must be 0 or greater");
    }

    return {
      platform: "Gumroad",
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

export function usePublishing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResult, storesResult] = await Promise.all([
          supabase.from("products").select("*").order("title"),
          supabase.from("stores").select("*").eq("is_active", true).order("name"),
        ]);

        if (productsResult.error) throw productsResult.error;
        if (storesResult.error) throw storesResult.error;

        setProducts(productsResult.data || []);
        setStores(storesResult.data || []);
      } catch (error) {
        console.error("Failed to fetch publishing data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const validateProducts = (
    selectedProductIds: string[],
    targetStoreId: string
  ): PlatformValidation[] => {
    const store = stores.find((s) => s.id === targetStoreId);
    if (!store) return [];

    const platform = store.platform.toLowerCase();
    const validator = platformValidators[platform];

    if (!validator) {
      // Default validation for unknown platforms
      return selectedProductIds.map((productId) => {
        const product = products.find((p) => p.id === productId);
        return {
          platform: store.platform,
          isValid: !!product?.title && !!product?.sku,
          errors: !product?.title ? ["Title is required"] : [],
          warnings: [],
        };
      });
    }

    return selectedProductIds.map((productId) => {
      const product = products.find((p) => p.id === productId);
      if (!product) {
        return {
          platform: store.platform,
          isValid: false,
          errors: ["Product not found"],
          warnings: [],
        };
      }
      return validator(product, store);
    });
  };

  const submitForPublishing = async (
    selectedProductIds: string[],
    targetStoreId: string,
    requiresApproval: boolean
  ) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      const store = stores.find((s) => s.id === targetStoreId);
      if (!store) throw new Error("Store not found");

      // Get org_id from the store
      const orgId = store.org_id;

      // Create listings for each product
      const listings: TablesInsert<"listings">[] = selectedProductIds.map(
        (productId) => ({
          product_id: productId,
          store_id: targetStoreId,
          status: requiresApproval ? "staged" : "publishing",
          staged_changes: {
            requested_at: new Date().toISOString(),
            requested_by: user.id,
          },
        })
      );

      // Check for existing listings
      const { data: existingListings } = await supabase
        .from("listings")
        .select("id, product_id")
        .eq("store_id", targetStoreId)
        .in("product_id", selectedProductIds);

      const existingProductIds = new Set(
        (existingListings || []).map((l) => l.product_id)
      );

      // Filter out products that already have listings
      const newListings = listings.filter(
        (l) => !existingProductIds.has(l.product_id)
      );
      const updateListings = listings.filter((l) =>
        existingProductIds.has(l.product_id)
      );

      // Insert new listings
      if (newListings.length > 0) {
        const { error: insertError } = await supabase
          .from("listings")
          .insert(newListings);

        if (insertError) throw insertError;
      }

      // Update existing listings
      for (const listing of updateListings) {
        const existingListing = existingListings?.find(
          (l) => l.product_id === listing.product_id
        );
        if (existingListing) {
          const { error: updateError } = await supabase
            .from("listings")
            .update({
              status: listing.status,
              staged_changes: listing.staged_changes,
            })
            .eq("id", existingListing.id);

          if (updateError) throw updateError;
        }
      }

      // If requires approval, create approval request
      if (requiresApproval) {
        const selectedProducts = products.filter((p) =>
          selectedProductIds.includes(p.id)
        );

        const { error: approvalError } = await supabase
          .from("approvals")
          .insert({
            org_id: orgId,
            resource_type: "listing",
            resource_id: targetStoreId,
            action: "publish",
            requested_by: user.id,
            payload: {
              store_id: targetStoreId,
              store_name: store.name,
              platform: store.platform,
              products: selectedProducts.map((p) => ({
                id: p.id,
                title: p.title,
                sku: p.sku,
                price: p.base_price,
              })),
              product_count: selectedProductIds.length,
            },
            status: "pending",
            expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(), // 7 days
          });

        if (approvalError) throw approvalError;

        toast.success("Publishing request submitted", {
          description: "Your request has been sent for approval.",
        });
      } else {
        // Create jobs to publish immediately
        const jobs = selectedProductIds.map((productId) => ({
          org_id: orgId,
          job_type: "listing_publish",
          store_id: targetStoreId,
          payload: { product_id: productId, store_id: targetStoreId },
          idempotency_key: `publish-${productId}-${targetStoreId}-${Date.now()}`,
          scheduled_at: new Date().toISOString(),
          priority: 5,
        }));

        const { error: jobsError } = await supabase.from("jobs").insert(jobs);

        if (jobsError) throw jobsError;

        toast.success("Publishing started", {
          description: `${selectedProductIds.length} products are being published.`,
        });
      }

      return true;
    } catch (error) {
      console.error("Publishing failed:", error);
      toast.error("Publishing failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    products,
    stores,
    isLoading,
    isSubmitting,
    validateProducts,
    submitForPublishing,
  };
}
