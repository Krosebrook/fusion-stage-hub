import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AuditLog = Tables<"audit_logs">;

interface UseAuditLogsOptions {
  search?: string;
  actionFilter?: string;
  resourceTypeFilter?: string;
  soc2TagFilter?: string;
  limit?: number;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const {
    search = "",
    actionFilter = "all",
    resourceTypeFilter = "all",
    soc2TagFilter = "all",
    limit = 100,
  } = options;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit + 1); // Fetch one extra to check if there are more

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      if (resourceTypeFilter !== "all") {
        query = query.eq("resource_type", resourceTypeFilter);
      }

      if (soc2TagFilter !== "all") {
        query = query.contains("soc2_tags", [soc2TagFilter]);
      }

      const { data, error } = await query;

      if (error) throw error;

      const fetchedLogs = data || [];
      setHasMore(fetchedLogs.length > limit);
      setLogs(fetchedLogs.slice(0, limit));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch audit logs"));
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, resourceTypeFilter, soc2TagFilter, limit]);

  useEffect(() => {
    fetchLogs();

    // Set up realtime subscription for new logs
    const channel = supabase
      .channel("audit-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
        },
        (payload) => {
          const newLog = payload.new as AuditLog;
          setLogs((prev) => [newLog, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs, limit]);

  // Client-side search filtering
  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
      log.resource_id?.toLowerCase().includes(searchLower) ||
      log.user_id?.toLowerCase().includes(searchLower) ||
      log.soc2_tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  // Get unique values for filters
  const uniqueActions = [...new Set(logs.map((l) => l.action))];
  const uniqueResourceTypes = [...new Set(logs.map((l) => l.resource_type))];
  const uniqueSoc2Tags = [...new Set(logs.flatMap((l) => l.soc2_tags || []))];

  return {
    logs: filteredLogs,
    isLoading,
    error,
    hasMore,
    refetch: fetchLogs,
    filterOptions: {
      actions: uniqueActions,
      resourceTypes: uniqueResourceTypes,
      soc2Tags: uniqueSoc2Tags,
    },
  };
}
