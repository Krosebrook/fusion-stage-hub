import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Store = Tables<"stores">;
type Listing = Tables<"listings">;

export interface StoreWithCounts extends Store {
  productCount: number;
  listingCount: number;
}

export function useStores() {
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();

    const channel = supabase
      .channel("stores-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stores" },
        () => fetchStores()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStores = async () => {
    try {
      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });

      if (storesError) throw storesError;

      // Fetch listing counts per store
      const storeIds = storesData.map((s) => s.id);
      
      const { data: listingsData } = await supabase
        .from("listings")
        .select("store_id, product_id")
        .in("store_id", storeIds);

      const countsByStore = (listingsData || []).reduce((acc, l) => {
        if (!acc[l.store_id]) {
          acc[l.store_id] = { listings: 0, products: new Set<string>() };
        }
        acc[l.store_id].listings++;
        acc[l.store_id].products.add(l.product_id);
        return acc;
      }, {} as Record<string, { listings: number; products: Set<string> }>);

      const enrichedStores = storesData.map((s) => ({
        ...s,
        listingCount: countsByStore[s.id]?.listings || 0,
        productCount: countsByStore[s.id]?.products.size || 0,
      }));

      setStores(enrichedStores);
    } catch (error: any) {
      console.error("Error fetching stores:", error);
      toast({
        title: "Error",
        description: "Failed to load stores",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createStore = async (store: TablesInsert<"stores">) => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .insert(store)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Store connected",
        description: `"${data.name}" has been added.`,
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

  const updateStore = async (id: string, updates: TablesUpdate<"stores">) => {
    try {
      const { error } = await supabase
        .from("stores")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Store updated",
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

  const deleteStore = async (id: string) => {
    try {
      const { error } = await supabase.from("stores").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Store disconnected",
        description: "The store has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const syncStore = async (id: string) => {
    try {
      // Update last_synced_at timestamp
      const { error } = await supabase
        .from("stores")
        .update({ 
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sync started",
        description: "Store synchronization has been triggered.",
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
    stores,
    isLoading,
    createStore,
    updateStore,
    deleteStore,
    syncStore,
    refetch: fetchStores,
  };
}
