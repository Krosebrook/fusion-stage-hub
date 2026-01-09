import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Approval = Tables<"approvals">;
type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export function useApprovals(statusFilter: ApprovalStatus | "all" = "pending") {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApprovals = async () => {
    try {
      let query = supabase
        .from("approvals")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApprovals(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch approvals"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();

    // Set up realtime subscription
    const channel = supabase
      .channel("approvals-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "approvals",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newApproval = payload.new as Approval;
            if (statusFilter === "all" || newApproval.status === statusFilter) {
              setApprovals((prev) => [newApproval, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedApproval = payload.new as Approval;
            setApprovals((prev) =>
              prev
                .map((a) => (a.id === updatedApproval.id ? updatedApproval : a))
                .filter((a) => statusFilter === "all" || a.status === statusFilter)
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setApprovals((prev) => prev.filter((a) => a.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const approveRequest = async (id: string, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("approvals")
        .update({
          status: "approved",
          decided_at: new Date().toISOString(),
          decided_by: user?.id || null,
          decision_reason: reason || null,
        })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Approval granted", {
        description: "The action has been approved and will be processed.",
      });
    } catch (err) {
      toast.error("Failed to approve", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const rejectRequest = async (id: string, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("approvals")
        .update({
          status: "rejected",
          decided_at: new Date().toISOString(),
          decided_by: user?.id || null,
          decision_reason: reason || null,
        })
        .eq("id", id);

      if (error) throw error;
      
      toast.error("Approval rejected", {
        description: "The action has been rejected and will not be processed.",
      });
    } catch (err) {
      toast.error("Failed to reject", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  return {
    approvals,
    isLoading,
    error,
    approveRequest,
    rejectRequest,
    refetch: fetchApprovals,
  };
}
