import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovals } from "@/hooks/useApprovals";
import { AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";

type TabValue = "pending" | "approved" | "rejected" | "all";

export default function Approvals() {
  const [activeTab, setActiveTab] = useState<TabValue>("pending");
  const { approvals, isLoading, approveRequest, rejectRequest } = useApprovals(
    activeTab === "all" ? "all" : activeTab
  );

  const handleApprove = (id: string) => {
    approveRequest(id);
  };

  const handleReject = (id: string) => {
    rejectRequest(id);
  };

  const getTabCount = (status: TabValue) => {
    if (status === "all") return approvals.length;
    return approvals.filter((a) => a.status === status).length;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Approval Queue</h2>
            <p className="text-muted-foreground">
              Review and approve pending actions before they are executed.
            </p>
          </div>
          {!isLoading && (
            <Badge variant="pending" className="text-sm">
              {approvals.filter((a) => a.status === "pending").length} pending
            </Badge>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="space-y-4"
        >
          <TabsList className="bg-muted">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Rejected
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : approvals.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up!"
                description="No pending approvals. Check back later."
              />
            ) : (
              <div className="grid gap-4">
                {approvals.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    id={approval.id}
                    resourceType={approval.resource_type}
                    action={approval.action}
                    requestedBy={approval.requested_by}
                    createdAt={approval.created_at}
                    payload={approval.payload as Record<string, unknown>}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : approvals.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No approved items"
                description="No recently approved items to show."
              />
            ) : (
              <div className="grid gap-4">
                {approvals.map((approval) => (
                  <ApprovalCardReadOnly
                    key={approval.id}
                    approval={approval}
                    variant="approved"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : approvals.length === 0 ? (
              <EmptyState
                icon={XCircle}
                title="No rejected items"
                description="No recently rejected items to show."
              />
            ) : (
              <div className="grid gap-4">
                {approvals.map((approval) => (
                  <ApprovalCardReadOnly
                    key={approval.id}
                    approval={approval}
                    variant="rejected"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof AlertCircle;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="text-muted-foreground text-sm mt-1">{description}</p>
    </div>
  );
}

function ApprovalCardReadOnly({
  approval,
  variant,
}: {
  approval: {
    id: string;
    resource_type: string;
    action: string;
    requested_by: string;
    created_at: string;
    decided_at: string | null;
    decision_reason: string | null;
    payload: unknown;
  };
  variant: "approved" | "rejected";
}) {
  const { formatDistanceToNow } = require("date-fns");

  return (
    <div
      className={`p-4 rounded-lg border ${
        variant === "approved"
          ? "border-success/30 bg-success/5"
          : "border-destructive/30 bg-destructive/5"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              variant === "approved" ? "bg-success/20" : "bg-destructive/20"
            }`}
          >
            {variant === "approved" ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
          </div>
          <div>
            <p className="font-medium capitalize">
              {approval.action} {approval.resource_type}
            </p>
            <p className="text-xs text-muted-foreground">
              {variant === "approved" ? "Approved" : "Rejected"}{" "}
              {approval.decided_at
                ? formatDistanceToNow(new Date(approval.decided_at), {
                    addSuffix: true,
                  })
                : "recently"}
            </p>
          </div>
        </div>
        <Badge variant={variant === "approved" ? "success" : "destructive"}>
          {variant}
        </Badge>
      </div>
      {approval.decision_reason && (
        <p className="text-sm text-muted-foreground mt-2">
          Reason: {approval.decision_reason}
        </p>
      )}
    </div>
  );
}
