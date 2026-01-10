import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type ApprovalStatus = Database["public"]["Enums"]["approval_status"];
type JobStatus = Database["public"]["Enums"]["job_status"];

interface ApprovalPayload {
  id: string;
  action: string;
  resource_type: string;
  status: ApprovalStatus;
}

interface JobPayload {
  id: string;
  job_type: string;
  status: JobStatus;
  last_error?: string | null;
}

interface StorePayload {
  id: string;
  name: string;
  last_synced_at: string | null;
  is_active: boolean;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "approvals",
        },
        (payload) => {
          const approval = payload.new as ApprovalPayload;
          toast({
            title: "New Approval Request",
            description: `${approval.action} on ${approval.resource_type} requires approval`,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "approvals",
        },
        (payload) => {
          const approval = payload.new as ApprovalPayload;
          if (approval.status === "approved") {
            toast({
              title: "Approval Granted",
              description: `${approval.action} on ${approval.resource_type} was approved`,
            });
          } else if (approval.status === "rejected") {
            toast({
              title: "Approval Rejected",
              description: `${approval.action} on ${approval.resource_type} was rejected`,
              variant: "destructive",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
        },
        (payload) => {
          const job = payload.new as JobPayload;
          if (job.status === "completed") {
            toast({
              title: "Job Completed",
              description: `${job.job_type} job finished successfully`,
            });
          } else if (job.status === "failed") {
            toast({
              title: "Job Failed",
              description: job.last_error || `${job.job_type} job failed`,
              variant: "destructive",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "stores",
        },
        (payload) => {
          const store = payload.new as StorePayload;
          const oldStore = payload.old as StorePayload;
          
          // Sync completed
          if (store.last_synced_at !== oldStore.last_synced_at && store.last_synced_at) {
            toast({
              title: "Store Synced",
              description: `${store.name} sync completed successfully`,
            });
          }
          
          // Store disconnected
          if (oldStore.is_active && !store.is_active) {
            toast({
              title: "Store Disconnected",
              description: `${store.name} has been disconnected`,
              variant: "destructive",
            });
          }
          
          // Store reconnected
          if (!oldStore.is_active && store.is_active) {
            toast({
              title: "Store Connected",
              description: `${store.name} is now active`,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);
}
