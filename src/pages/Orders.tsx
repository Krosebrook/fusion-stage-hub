import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatusBadge, FulfillmentStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderDetailDialog } from "@/components/orders/OrderDetailDialog";
import { useOrders, type OrderWithItems } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Package, Truck, CheckCircle, XCircle, Clock, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type FulfillmentStatus = Database["public"]["Enums"]["fulfillment_status"];

export default function Orders() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentStatus | "all">("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    orders,
    loading,
    fetchOrders,
    fetchOrderItems,
    updateOrderStatus,
    fulfillOrderItem,
    cancelOrder,
  } = useOrders(orgId);

  // Fetch org membership
  useEffect(() => {
    async function fetchOrg() {
      if (!user) return;

      const { data } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setOrgId(data.org_id);
      }
    }

    fetchOrg();
  }, [user]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesFulfillment =
      fulfillmentFilter === "all" || order.fulfillment_status === fulfillmentFilter;

    return matchesSearch && matchesStatus && matchesFulfillment;
  });

  const statusCounts = orders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      acc.total++;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  const handleViewOrder = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  const statCards = [
    {
      title: "Total Orders",
      value: statusCounts.total || 0,
      icon: Package,
      color: "text-blue-500",
    },
    {
      title: "Pending",
      value: statusCounts.pending || 0,
      icon: Clock,
      color: "text-yellow-500",
    },
    {
      title: "Processing",
      value: statusCounts.processing || 0,
      icon: RefreshCcw,
      color: "text-purple-500",
    },
    {
      title: "Shipped",
      value: statusCounts.shipped || 0,
      icon: Truck,
      color: "text-cyan-500",
    },
    {
      title: "Delivered",
      value: statusCounts.delivered || 0,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      title: "Cancelled",
      value: statusCounts.cancelled || 0,
      icon: XCircle,
      color: "text-red-500",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">
              Manage orders and fulfillment workflows
            </p>
          </div>
          <Button onClick={() => fetchOrders()} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.title}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders by number, customer..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as OrderStatus | "all")}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={fulfillmentFilter}
                onValueChange={(value) => setFulfillmentFilter(value as FulfillmentStatus | "all")}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Fulfillment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fulfillment</SelectItem>
                  <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Placed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">
                              {order.customer_name || "Guest"}
                            </div>
                            {order.customer_email && (
                              <div className="text-xs text-muted-foreground">
                                {order.customer_email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.store ? (
                            <Badge variant="outline">{order.store.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell>
                          <FulfillmentStatusBadge status={order.fulfillment_status} />
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.currency} {Number(order.total).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(order.placed_at || order.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewOrder(order)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusChange={updateOrderStatus}
        onFulfillItem={fulfillOrderItem}
        onCancelOrder={cancelOrder}
        fetchOrderItems={fetchOrderItems}
      />
    </AppLayout>
  );
}
