import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatusBadge, FulfillmentStatusBadge } from "./OrderStatusBadge";
import { Package, Truck, MapPin, User, Mail, Calendar, Store } from "lucide-react";
import { format } from "date-fns";
import type { OrderWithItems } from "@/hooks/useOrders";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

interface OrderDetailDialogProps {
  order: OrderWithItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onFulfillItem: (itemId: string, quantity: number) => void;
  onCancelOrder: (orderId: string) => void;
  fetchOrderItems: (orderId: string) => Promise<OrderItem[]>;
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onStatusChange,
  onFulfillItem,
  onCancelOrder,
  fetchOrderItems,
}: OrderDetailDialogProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (order && open) {
      setLoadingItems(true);
      fetchOrderItems(order.id)
        .then(setItems)
        .finally(() => setLoadingItems(false));
    }
  }, [order, open, fetchOrderItems]);

  if (!order) return null;

  const shippingAddress = order.shipping_address as Record<string, string> | null;
  const canCancel = !["cancelled", "delivered", "refunded"].includes(order.status);

  const statusOptions: OrderStatus[] = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Order #{order.order_number}</span>
            <OrderStatusBadge status={order.status} />
            <FulfillmentStatusBadge status={order.fulfillment_status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Placed: {format(new Date(order.placed_at || order.created_at), "PPp")}</span>
              </div>
              {order.store && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Store className="h-4 w-4" />
                  <span>{order.store.name} ({order.store.platform})</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {order.shipped_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>Shipped: {format(new Date(order.shipped_at), "PPp")}</span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <Package className="h-4 w-4" />
                  <span>Delivered: {format(new Date(order.delivered_at), "PPp")}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="font-medium">Customer</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer_name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{order.customer_email || "N/A"}</span>
              </div>
            </div>
            {shippingAddress && Object.keys(shippingAddress).length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {shippingAddress.line1 && <div>{shippingAddress.line1}</div>}
                  {shippingAddress.line2 && <div>{shippingAddress.line2}</div>}
                  <div>
                    {[shippingAddress.city, shippingAddress.state, shippingAddress.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  {shippingAddress.country && <div>{shippingAddress.country}</div>}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="font-medium">Items</h4>
            {loadingItems ? (
              <div className="text-sm text-muted-foreground">Loading items...</div>
            ) : items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.title}</div>
                      {item.sku && (
                        <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Qty: {item.quantity} × {order.currency} {Number(item.unit_price).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-medium">
                          {order.currency} {Number(item.total_price).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.fulfilled_quantity || 0}/{item.quantity} fulfilled
                        </div>
                      </div>
                      {item.fulfilled_quantity < item.quantity && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onFulfillItem(item.id, 1)}
                        >
                          Fulfill
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No line items found</div>
            )}
          </div>

          <Separator />

          {/* Order Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{order.currency} {Number(order.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{order.currency} {Number(order.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{order.currency} {Number(order.shipping).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{order.currency} {Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Change Status:</span>
              <Select
                value={order.status}
                onValueChange={(value) => onStatusChange(order.id, value as OrderStatus)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancelOrder(order.id)}
              >
                Cancel Order
              </Button>
            )}
          </div>

          {order.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">Notes</h4>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
