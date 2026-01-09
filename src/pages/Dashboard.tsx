import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusIndicator } from "@/components/dashboard/StatusIndicator";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Layers,
  Store,
  Package,
  AlertTriangle,
  ArrowRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useRealtimeMetrics } from "@/hooks/useRealtimeMetrics";

export default function Dashboard() {
  const {
    metrics,
    recentJobs,
    pendingApprovals,
    storeStatuses,
    isLoading,
    refetch,
  } = useRealtimeMetrics();

  const getStoreStatus = (store: {
    is_active: boolean;
    last_synced_at: string | null;
  }): "success" | "warning" | "pending" | "error" => {
    if (!store.is_active) return "pending";
    if (!store.last_synced_at) return "warning";
    const hoursSinceSync =
      (Date.now() - new Date(store.last_synced_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceSync > 24) return "warning";
    if (hoursSinceSync > 48) return "error";
    return "success";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Real-time overview of your operations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            <>
              <MetricCard
                title="Pending Approvals"
                value={metrics.pendingApprovals}
                subtitle={
                  metrics.expiringApprovals > 0
                    ? `${metrics.expiringApprovals} expiring soon`
                    : "None expiring soon"
                }
                icon={CheckCircle2}
                trend={
                  metrics.pendingApprovals > 10
                    ? { value: metrics.pendingApprovals - 10, isPositive: false }
                    : undefined
                }
              />
              <MetricCard
                title="Active Jobs"
                value={metrics.activeJobs}
                subtitle={`${metrics.completedToday} completed today`}
                icon={Layers}
                trend={
                  metrics.failedJobs > 0
                    ? { value: metrics.failedJobs, isPositive: false }
                    : { value: metrics.runningJobs, isPositive: true }
                }
              />
              <MetricCard
                title="Connected Stores"
                value={metrics.connectedStores}
                subtitle={
                  metrics.healthyStores === metrics.connectedStores
                    ? "All healthy"
                    : `${metrics.healthyStores} healthy`
                }
                icon={Store}
              />
              <MetricCard
                title="Total Products"
                value={metrics.totalProducts.toLocaleString()}
                subtitle={`${metrics.stagedProducts} staged for publish`}
                icon={Package}
                trend={
                  metrics.stagedProducts > 0
                    ? { value: metrics.stagedProducts, isPositive: true }
                    : undefined
                }
              />
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Jobs */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Recent Jobs</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/jobs">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No jobs yet. Jobs will appear here when processing starts.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Layers className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm capitalize">
                            {job.job_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {job.store_name || "System"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(job.created_at), {
                            addSuffix: true,
                          })}
                        </div>
                        <JobStatusBadge
                          status={
                            job.status as
                              | "pending"
                              | "running"
                              | "completed"
                              | "failed"
                              | "claimed"
                              | "cancelled"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Pending Approvals
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/approvals">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : pendingApprovals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending approvals. You&apos;re all caught up!
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApprovals.map((approval) => {
                    const payload = approval.payload as Record<string, unknown>;
                    return (
                      <div
                        key={approval.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5"
                      >
                        <div>
                          <p className="font-medium text-sm capitalize">
                            {approval.action} {approval.resource_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payload?.store_name as string || "Unknown"} •{" "}
                            {formatDistanceToNow(new Date(approval.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Platform Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Platform Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : storeStatuses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No stores connected yet. Add your first store to get started.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {storeStatuses.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium truncate block">
                        {store.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {store.platform}
                      </span>
                    </div>
                    <StatusIndicator
                      status={getStoreStatus(store)}
                      pulse={getStoreStatus(store) === "success"}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
