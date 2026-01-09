import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate, Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

type SettingsDefinition = Tables<"settings_definitions">;
type SettingsValue = Tables<"settings_values">;
type Org = Tables<"orgs">;
type Store = Tables<"stores">;
type PluginInstance = Tables<"plugin_instances">;

interface SettingWithValue extends SettingsDefinition {
  currentValue: Json | null;
  valueId: string | null;
}

export function useSettings() {
  const [definitions, setDefinitions] = useState<SettingsDefinition[]>([]);
  const [values, setValues] = useState<SettingsValue[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [pluginInstances, setPluginInstances] = useState<PluginInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [defsResult, valsResult, orgsResult, storesResult, pluginsResult] =
        await Promise.all([
          supabase.from("settings_definitions").select("*").order("name"),
          supabase.from("settings_values").select("*").eq("is_active", true),
          supabase.from("orgs").select("*"),
          supabase.from("stores").select("*").eq("is_active", true),
          supabase
            .from("plugin_instances")
            .select("*, plugins(name, slug)")
            .eq("is_enabled", true),
        ]);

      if (defsResult.error) throw defsResult.error;
      if (valsResult.error) throw valsResult.error;
      if (orgsResult.error) throw orgsResult.error;
      if (storesResult.error) throw storesResult.error;
      if (pluginsResult.error) throw pluginsResult.error;

      setDefinitions(defsResult.data || []);
      setValues(valsResult.data || []);
      setOrgs(orgsResult.data || []);
      setStores(storesResult.data || []);
      setPluginInstances(pluginsResult.data || []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSettingsForScope = (
    scope: "global" | "org" | "store" | "plugin_instance",
    scopeId?: string
  ): SettingWithValue[] => {
    const scopeDefinitions = definitions.filter((d) => d.scope === scope);

    return scopeDefinitions.map((def) => {
      const value = values.find(
        (v) =>
          v.definition_id === def.id &&
          v.scope === scope &&
          (scopeId ? v.scope_id === scopeId : !v.scope_id)
      );

      return {
        ...def,
        currentValue: value?.value ?? def.default_value,
        valueId: value?.id ?? null,
      };
    });
  };

  const saveSetting = async (
    definitionId: string,
    scope: "global" | "org" | "store" | "plugin_instance",
    scopeId: string | null,
    value: Json
  ) => {
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Find existing value
      const existingValue = values.find(
        (v) =>
          v.definition_id === definitionId &&
          v.scope === scope &&
          v.scope_id === scopeId
      );

      if (existingValue) {
        // Deactivate old value and insert new one (versioned)
        await supabase
          .from("settings_values")
          .update({ is_active: false })
          .eq("id", existingValue.id);

        const { error } = await supabase.from("settings_values").insert({
          definition_id: definitionId,
          scope,
          scope_id: scopeId,
          value,
          version: (existingValue.version || 0) + 1,
          created_by: user?.id || null,
          is_active: true,
        });

        if (error) throw error;
      } else {
        // Insert new value
        const { error } = await supabase.from("settings_values").insert({
          definition_id: definitionId,
          scope,
          scope_id: scopeId,
          value,
          version: 1,
          created_by: user?.id || null,
          is_active: true,
        });

        if (error) throw error;
      }

      toast.success("Setting saved");
      await fetchData();
    } catch (error) {
      console.error("Failed to save setting:", error);
      toast.error("Failed to save setting");
    } finally {
      setIsSaving(false);
    }
  };

  const updateOrgSettings = async (orgId: string, settings: Json) => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("orgs")
        .update({ settings })
        .eq("id", orgId);

      if (error) throw error;

      toast.success("Organization settings saved");
      await fetchData();
    } catch (error) {
      console.error("Failed to save org settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateStoreSettings = async (storeId: string, settings: Json) => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("stores")
        .update({ settings })
        .eq("id", storeId);

      if (error) throw error;

      toast.success("Store settings saved");
      await fetchData();
    } catch (error) {
      console.error("Failed to save store settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updatePluginConfig = async (instanceId: string, config: Json) => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("plugin_instances")
        .update({ config })
        .eq("id", instanceId);

      if (error) throw error;

      toast.success("Plugin configuration saved");
      await fetchData();
    } catch (error) {
      console.error("Failed to save plugin config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    definitions,
    values,
    orgs,
    stores,
    pluginInstances,
    isLoading,
    isSaving,
    getSettingsForScope,
    saveSetting,
    updateOrgSettings,
    updateStoreSettings,
    updatePluginConfig,
    refetch: fetchData,
  };
}
