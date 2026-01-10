import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type WebhookEvent = Database["public"]["Tables"]["webhook_events"]["Row"];
type WebhookStatus = Database["public"]["Enums"]["webhook_status"];

export interface WebhookEventWithStore extends WebhookEvent {
  store?: {
    id: string;
    name: string;
    platform: string;
  } | null;
}

export function useWebhookEvents(orgId?: string) {
  const [events, setEvents] = useState<WebhookEventWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!orgId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First get stores for the org
      const { data: stores } = await supabase
        .from("stores")
        .select("id")
        .eq("org_id", orgId);

      if (!stores || stores.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const storeIds = stores.map(s => s.id);

      const { data, error: fetchError } = await supabase
        .from("webhook_events")
        .select(`
          *,
          store:stores(id, name, platform)
        `)
        .in("store_id", storeIds)
        .order("created_at", { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      setEvents((data as WebhookEventWithStore[]) || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching webhook events:", err);
      setError("Failed to fetch webhook events");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const replayEvent = async (eventId: string) => {
    try {
      // Mark as processing
      const { error: updateError } = await supabase
        .from("webhook_events")
        .update({ 
          status: "processing" as WebhookStatus,
          processed_at: null,
          error: null 
        })
        .eq("id", eventId);

      if (updateError) throw updateError;

      toast({
        title: "Replay Initiated",
        description: "Webhook event has been queued for reprocessing",
      });

      await fetchEvents();
    } catch (err) {
      console.error("Error replaying webhook event:", err);
      toast({
        title: "Error",
        description: "Failed to replay webhook event",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("webhook_events")
        .delete()
        .eq("id", eventId);

      if (deleteError) throw deleteError;

      toast({
        title: "Event Deleted",
        description: "Webhook event has been removed",
      });

      await fetchEvents();
    } catch (err) {
      console.error("Error deleting webhook event:", err);
      toast({
        title: "Error",
        description: "Failed to delete webhook event",
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel("webhook-events-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "webhook_events",
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchEvents]);

  return {
    events,
    loading,
    error,
    fetchEvents,
    replayEvent,
    deleteEvent,
  };
}
