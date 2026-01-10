import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Variant = Tables<"variants">;
type Listing = Tables<"listings">;

export interface ProductWithDetails extends Product {
  variants: Variant[];
  listings: Listing[];
}

export function useProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => fetchProducts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "variants" },
        () => fetchProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      // Fetch variants and listings for each product
      const productIds = productsData.map((p) => p.id);
      
      const [variantsResult, listingsResult] = await Promise.all([
        supabase.from("variants").select("*").in("product_id", productIds),
        supabase.from("listings").select("*").in("product_id", productIds),
      ]);

      const variantsByProduct = (variantsResult.data || []).reduce((acc, v) => {
        if (!acc[v.product_id]) acc[v.product_id] = [];
        acc[v.product_id].push(v);
        return acc;
      }, {} as Record<string, Variant[]>);

      const listingsByProduct = (listingsResult.data || []).reduce((acc, l) => {
        if (!acc[l.product_id]) acc[l.product_id] = [];
        acc[l.product_id].push(l);
        return acc;
      }, {} as Record<string, Listing[]>);

      const enrichedProducts = productsData.map((p) => ({
        ...p,
        variants: variantsByProduct[p.id] || [],
        listings: listingsByProduct[p.id] || [],
      }));

      setProducts(enrichedProducts);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createProduct = async (product: TablesInsert<"products">) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert(product)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Product created",
        description: `"${data.title}" has been added.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProduct = async (id: string, updates: TablesUpdate<"products">) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Product updated",
        description: "Changes have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Product deleted",
        description: "The product has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Variant operations
  const createVariant = async (variant: TablesInsert<"variants">) => {
    try {
      const { data, error } = await supabase
        .from("variants")
        .insert(variant)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Variant added",
        description: `"${data.name}" has been created.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateVariant = async (id: string, updates: TablesUpdate<"variants">) => {
    try {
      const { error } = await supabase
        .from("variants")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Variant updated",
        description: "Changes have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteVariant = async (id: string) => {
    try {
      const { error } = await supabase.from("variants").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Variant deleted",
        description: "The variant has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariant,
    refetch: fetchProducts,
  };
}
