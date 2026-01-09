import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardMetrics {
  pendingApprovals: number;
  expiringApprovals: number;
  activeJobs: number;
  completedToday: number;
  failedJobs: number;
  runningJobs: number;
  connectedStores: number;
  healthyStores: number;
  totalProducts: number;
  stagedProducts: number;
}

interface RecentJob {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
  store_id: string | null;
  store_name?: string;
}

interface PendingApproval {
  id: string;
  action: string;
  resource_type: string;
  payload: unknown;
  created_at: string;
}

interface StoreStatus {
  id: string;
  name: string;
  platform: string;
  is_active: boolean;
  last_synced_at: string | null;
}

export function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    pendingApprovals: 0,
    expiringApprovals: 0,
    activeJobs: 0,
    completedToday: 0,
    failedJobs: 0,
    runningJobs: 0,
    connectedStores: 0,
    healthyStores: 0,
    totalProducts: 0,
    stagedProducts: 0,
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [storeStatuses, setStoreStatuses] = useState<StoreStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Fetch all metrics in parallel
      const [
        approvalsResult,
        jobsResult,
        storesResult,
        productsResult,
        listingsResult,
        recentJobsResult,
        pendingApprovalsResult,
      ] = await Promise.all([
        // Pending approvals count
        supabase
          .from("approvals")
          .select("id, expires_at", { count: "exact" })
          .eq("status", "pending"),
        // Jobs counts
        supabase.from("jobs").select("id, status, created_at, completed_at"),
        // Stores
        supabase.from("stores").select("id, name, platform, is_active, last_synced_at"),
        // Products count
        supabase.from("products").select("id", { count: "exact" }),
        // Staged listings
        supabase
          .from("listings")
          .select("id", { count: "exact" })
          .eq("status", "staged"),
        // Recent jobs with store info
        supabase
          .from("jobs")
          .select("id, job_type, status, created_at, store_id")
          .order("created_at", { ascending: false })
          .limit(5),
        // Pending approvals for sidebar
        supabase
          .from("approvals")
          .select("id, action, resource_type, payload, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Calculate expiring approvals (within 24 hours)
      const expiringCount = (approvalsResult.data || []).filter((a) => {
        if (!a.expires_at) return false;
        const expiresAt = new Date(a.expires_at);
        const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
        return hoursUntilExpiry > 0 && hoursUntilExpiry <= 24;
      }).length;

      // Calculate job stats
      const jobs = jobsResult.data || [];
      const activeJobs = jobs.filter((j) =>
        ["pending", "claimed", "running"].includes(j.status)
      ).length;
      const completedToday = jobs.filter(
        (j) =>
          j.status === "completed" &&
          j.completed_at &&
          new Date(j.completed_at) >= todayStart
      ).length;
      const failedJobs = jobs.filter((j) => j.status === "failed").length;
      const runningJobs = jobs.filter((j) => j.status === "running").length;

      // Store stats
      const stores = storesResult.data || [];
      const healthyStores = stores.filter((s) => {
        if (!s.is_active) return false;
        if (!s.last_synced_at) return true; // New stores are considered healthy
        const hoursSinceSync =
          (Date.now() - new Date(s.last_synced_at).getTime()) / (1000 * 60 * 60);
        return hoursSinceSync < 24;
      }).length;

      setMetrics({
        pendingApprovals: approvalsResult.count || 0,
        expiringApprovals: expiringCount,
        activeJobs,
        completedToday,
        failedJobs,
        runningJobs,
        connectedStores: stores.length,
        healthyStores,
        totalProducts: productsResult.count || 0,
        stagedProducts: listingsResult.count || 0,
      });

      setRecentJobs(recentJobsResult.data || []);
      setPendingApprovals(pendingApprovalsResult.data || []);
      setStoreStatuses(stores);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    // Set up realtime subscriptions for all relevant tables
    const jobsChannel = supabase
      .channel("dashboard-jobs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        () => fetchMetrics()
      )
      .subscribe();

    const approvalsChannel = supabase
      .channel("dashboard-approvals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approvals" },
        () => fetchMetrics()
      )
      .subscribe();

    const storesChannel = supabase
      .channel("dashboard-stores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stores" },
        () => fetchMetrics()
      )
      .subscribe();

    const productsChannel = supabase
      .channel("dashboard-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => fetchMetrics()
      )
      .subscribe();

    const listingsChannel = supabase
      .channel("dashboard-listings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => fetchMetrics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(approvalsChannel);
      supabase.removeChannel(storesChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(listingsChannel);
    };
  }, [fetchMetrics]);

  return {
    metrics,
    recentJobs,
    pendingApprovals,
    storeStatuses,
    isLoading,
    refetch: fetchMetrics,
  };
}
