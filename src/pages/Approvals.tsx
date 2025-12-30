import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Mock data
const mockApprovals = [
  {
    id: "1",
    resourceType: "listing",
    action: "publish",
    requestedBy: "john@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    payload: { title: "Vintage Band T-Shirt", store: "Etsy Vintage", price: 29.99 },
  },
  {
    id: "2",
    resourceType: "product",
    action: "update",
    requestedBy: "jane@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    payload: { sku: "CANVAS-001", changes: { price: 49.99, inventory: 100 } },
  },
  {
    id: "3",
    resourceType: "listing",
    action: "delete",
    requestedBy: "admin@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    payload: { listingId: "etsy-123456", reason: "Product discontinued" },
  },
];

export default function Approvals() {
  const [approvals, setApprovals] = useState(mockApprovals);

  const handleApprove = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    toast.success("Approval granted", {
      description: "The action has been approved and will be processed.",
    });
  };

  const handleReject = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    toast.error("Approval rejected", {
      description: "The action has been rejected and will not be processed.",
    });
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
          <Badge variant="pending" className="text-sm">
            {approvals.length} pending
          </Badge>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {approvals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending approvals. You&apos;re all caught up!
              </div>
            ) : (
              <div className="grid gap-4">
                {approvals.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    {...approval}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved">
            <div className="text-center py-12 text-muted-foreground">
              No recently approved items to show.
            </div>
          </TabsContent>

          <TabsContent value="rejected">
            <div className="text-center py-12 text-muted-foreground">
              No recently rejected items to show.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
