import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, Loader2, PlayCircle, Ban } from "lucide-react";

type JobStatus = "pending" | "claimed" | "running" | "completed" | "failed" | "cancelled";

interface JobStatusBadgeProps {
  status: JobStatus;
}

const statusConfig: Record<JobStatus, { icon: typeof Clock; variant: "pending" | "running" | "completed" | "failed" | "warning" | "secondary"; label: string }> = {
  pending: { icon: Clock, variant: "pending", label: "Pending" },
  claimed: { icon: PlayCircle, variant: "warning", label: "Claimed" },
  running: { icon: Loader2, variant: "running", label: "Running" },
  completed: { icon: CheckCircle2, variant: "completed", label: "Completed" },
  failed: { icon: XCircle, variant: "failed", label: "Failed" },
  cancelled: { icon: Ban, variant: "secondary", label: "Cancelled" },
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1.5">
      <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}
