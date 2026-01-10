import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Plugin = Tables<"plugins">;
type PluginContract = Tables<"plugin_contracts">;
type PluginInstance = Tables<"plugin_instances">;

export interface PluginWithContracts extends Plugin {
  contracts: PluginContract[];
  instances: PluginInstance[];
}

export function usePlugins() {
  const { toast } = useToast();
  const [plugins, setPlugins] = useState<PluginWithContracts[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    try {
      const { data: pluginsData, error: pluginsError } = await supabase
        .from("plugins")
        .select("*")
        .order("name", { ascending: true });

      if (pluginsError) throw pluginsError;

      const pluginIds = pluginsData.map((p) => p.id);

      const [contractsResult, instancesResult] = await Promise.all([
        supabase.from("plugin_contracts").select("*").in("plugin_id", pluginIds),
        supabase.from("plugin_instances").select("*").in("plugin_id", pluginIds),
      ]);

      const contractsByPlugin = (contractsResult.data || []).reduce((acc, c) => {
        if (!acc[c.plugin_id]) acc[c.plugin_id] = [];
        acc[c.plugin_id].push(c);
        return acc;
      }, {} as Record<string, PluginContract[]>);

      const instancesByPlugin = (instancesResult.data || []).reduce((acc, i) => {
        if (!acc[i.plugin_id]) acc[i.plugin_id] = [];
        acc[i.plugin_id].push(i);
        return acc;
      }, {} as Record<string, PluginInstance[]>);

      const enrichedPlugins = pluginsData.map((p) => ({
        ...p,
        contracts: contractsByPlugin[p.id] || [],
        instances: instancesByPlugin[p.id] || [],
      }));

      setPlugins(enrichedPlugins);
    } catch (error: any) {
      console.error("Error fetching plugins:", error);
      toast({
        title: "Error",
        description: "Failed to load plugins",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePluginInstance = async (instanceId: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from("plugin_instances")
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq("id", instanceId);

      if (error) throw error;

      setPlugins((prev) =>
        prev.map((p) => ({
          ...p,
          instances: p.instances.map((i) =>
            i.id === instanceId ? { ...i, is_enabled: isEnabled } : i
          ),
        }))
      );

      toast({
        title: isEnabled ? "Plugin enabled" : "Plugin disabled",
        description: `The plugin instance has been ${isEnabled ? "enabled" : "disabled"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createPluginInstance = async (
    pluginId: string,
    storeId: string,
    config?: Record<string, any>
  ) => {
    try {
      const { data, error } = await supabase
        .from("plugin_instances")
        .insert({
          plugin_id: pluginId,
          store_id: storeId,
          config: config || {},
          is_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;

      setPlugins((prev) =>
        prev.map((p) =>
          p.id === pluginId ? { ...p, instances: [...p.instances, data] } : p
        )
      );

      toast({
        title: "Plugin installed",
        description: "The plugin has been installed for this store.",
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

  const deletePluginInstance = async (instanceId: string) => {
    try {
      const { error } = await supabase
        .from("plugin_instances")
        .delete()
        .eq("id", instanceId);

      if (error) throw error;

      setPlugins((prev) =>
        prev.map((p) => ({
          ...p,
          instances: p.instances.filter((i) => i.id !== instanceId),
        }))
      );

      toast({
        title: "Plugin uninstalled",
        description: "The plugin has been removed from this store.",
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
    plugins,
    isLoading,
    togglePluginInstance,
    createPluginInstance,
    deletePluginInstance,
    refetch: fetchPlugins,
  };
}
