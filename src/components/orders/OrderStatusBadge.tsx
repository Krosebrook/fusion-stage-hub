import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type FulfillmentStatus = Database["public"]["Enums"]["fulfillment_status"];

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  processing: {
    label: "Processing",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  shipped: {
    label: "Shipped",
    className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  refunded: {
    label: "Refunded",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

interface FulfillmentStatusBadgeProps {
  status: FulfillmentStatus;
  className?: string;
}

const fulfillmentConfig: Record<FulfillmentStatus, { label: string; className: string }> = {
  unfulfilled: {
    label: "Unfulfilled",
    className: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
  partial: {
    label: "Partial",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  fulfilled: {
    label: "Fulfilled",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
};

export function FulfillmentStatusBadge({ status, className }: FulfillmentStatusBadgeProps) {
  const config = fulfillmentConfig[status] || fulfillmentConfig.unfulfilled;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
