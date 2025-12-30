import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusIndicator } from "@/components/dashboard/StatusIndicator";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Layers,
  Store,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

// Mock data for demo
const recentJobs = [
  { id: "1", type: "sync_inventory", store: "Shopify Main", status: "completed" as const, created: new Date(Date.now() - 1000 * 60 * 5) },
  { id: "2", type: "publish_listing", store: "Etsy Vintage", status: "running" as const, created: new Date(Date.now() - 1000 * 60 * 2) },
  { id: "3", type: "import_orders", store: "Amazon SC", status: "pending" as const, created: new Date(Date.now() - 1000 * 60 * 1) },
  { id: "4", type: "update_prices", store: "Printify", status: "failed" as const, created: new Date(Date.now() - 1000 * 60 * 15) },
];

const pendingApprovals = [
  { id: "1", type: "Publish Listing", product: "Vintage T-Shirt", store: "Etsy" },
  { id: "2", type: "Update Price", product: "Canvas Print 24x36", store: "Shopify" },
  { id: "3", type: "Delete Product", product: "Old Mug Design", store: "Printify" },
];

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <MetricCard
            title="Pending Approvals"
            value={12}
            subtitle="3 expiring soon"
            icon={CheckCircle2}
            trend={{ value: 15, isPositive: false }}
          />
          <MetricCard
            title="Active Jobs"
            value={47}
            subtitle="23 completed today"
            icon={Layers}
            trend={{ value: 8, isPositive: true }}
          />
          <MetricCard
            title="Connected Stores"
            value={6}
            subtitle="All healthy"
            icon={Store}
          />
          <MetricCard
            title="Total Products"
            value="1,234"
            subtitle="89 staged for publish"
            icon={Package}
            trend={{ value: 12, isPositive: true }}
          />
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
                          {job.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{job.store}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(job.created, { addSuffix: true })}
                      </div>
                      <JobStatusBadge status={job.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Pending Approvals</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/approvals">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5"
                  >
                    <div>
                      <p className="font-medium text-sm">{approval.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {approval.product} • {approval.store}
                      </p>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Platform Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { name: "Shopify", status: "success" as const },
                { name: "Etsy", status: "success" as const },
                { name: "Amazon SC", status: "warning" as const },
                { name: "Printify", status: "success" as const },
                { name: "Gumroad", status: "success" as const },
                { name: "Amazon KDP", status: "pending" as const },
              ].map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <span className="text-sm font-medium">{platform.name}</span>
                  <StatusIndicator status={platform.status} pulse={platform.status === "success"} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
