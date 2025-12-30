import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "error" | "info" | "pending";

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusColors: Record<StatusType, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  pending: "bg-muted-foreground",
};

const statusLabels: Record<StatusType, string> = {
  success: "Active",
  warning: "Warning",
  error: "Error",
  info: "Info",
  pending: "Pending",
};

const sizeClasses = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

export function StatusIndicator({
  status,
  label,
  pulse = false,
  size = "md",
}: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={cn(
            "rounded-full",
            statusColors[status],
            sizeClasses[size]
          )}
        />
        {pulse && (
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-pulse-ring",
              statusColors[status]
            )}
          />
        )}
      </div>
      {label !== undefined && (
        <span className="text-sm text-muted-foreground">
          {label || statusLabels[status]}
        </span>
      )}
    </div>
  );
}
