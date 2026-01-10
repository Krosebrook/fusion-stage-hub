import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type MediaAsset = Tables<"media_assets">;

export function useMediaAssets(productId?: string) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      fetchAssets();
    } else {
      setIsLoading(false);
    }
  }, [productId]);

  const fetchAssets = async () => {
    if (!productId) return;
    
    try {
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("product_id", productId)
        .order("position", { ascending: true });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error("Error fetching media assets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAsset = async (file: File, orgId: string) => {
    if (!productId) return null;

    const fileExt = file.name.split(".").pop();
    const filePath = `${orgId}/${productId}/${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("product-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-media")
        .getPublicUrl(filePath);

      // Create media asset record
      const { data, error } = await supabase
        .from("media_assets")
        .insert({
          product_id: productId,
          org_id: orgId,
          url: publicUrl,
          type: file.type.startsWith("video/") ? "video" : "image",
          position: assets.length,
          alt_text: file.name.replace(/\.[^/.]+$/, ""),
        })
        .select()
        .single();

      if (error) throw error;

      setAssets((prev) => [...prev, data]);
      
      toast({
        title: "Image uploaded",
        description: "Media has been added to the product.",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateAsset = async (id: string, updates: TablesUpdate<"media_assets">) => {
    try {
      const { error } = await supabase
        .from("media_assets")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );

      toast({
        title: "Asset updated",
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

  const deleteAsset = async (id: string) => {
    try {
      const asset = assets.find((a) => a.id === id);
      
      // Delete from storage
      if (asset) {
        const urlParts = asset.url.split("/");
        const filePath = urlParts.slice(-3).join("/");
        await supabase.storage.from("product-media").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase.from("media_assets").delete().eq("id", id);

      if (error) throw error;

      setAssets((prev) => prev.filter((a) => a.id !== id));

      toast({
        title: "Asset deleted",
        description: "Media has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const reorderAssets = async (reorderedAssets: MediaAsset[]) => {
    try {
      // Update positions
      const updates = reorderedAssets.map((asset, index) => ({
        id: asset.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from("media_assets")
          .update({ position: update.position })
          .eq("id", update.id);
      }

      setAssets(reorderedAssets.map((a, i) => ({ ...a, position: i })));

      toast({
        title: "Order updated",
        description: "Media order has been saved.",
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
    assets,
    isLoading,
    uploadAsset,
    updateAsset,
    deleteAsset,
    reorderAssets,
    refetch: fetchAssets,
  };
}
