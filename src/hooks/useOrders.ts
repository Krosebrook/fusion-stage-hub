import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];
type FulfillmentStatus = Database["public"]["Enums"]["fulfillment_status"];

export interface OrderWithItems extends Order {
  items?: OrderItem[];
  store?: {
    id: string;
    name: string;
    platform: string;
  } | null;
}

export function useOrders(orgId?: string) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!orgId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(`
          *,
          store:stores(id, name, platform)
        `)
        .eq("org_id", orgId)
        .order("placed_at", { ascending: false });

      if (fetchError) throw fetchError;
      setOrders((data as OrderWithItems[]) || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders");
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string): Promise<OrderItem[]> => {
    const { data, error: fetchError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (fetchError) {
      console.error("Error fetching order items:", fetchError);
      return [];
    }
    return data || [];
  };

  const createOrder = async (order: OrderInsert) => {
    try {
      const { data, error: insertError } = await supabase
        .from("orders")
        .insert(order)
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Order Created",
        description: `Order ${order.order_number} has been created`,
      });

      await fetchOrders();
      return data;
    } catch (err) {
      console.error("Error creating order:", err);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const updateData: OrderUpdate = { status };
      
      // Set timestamps based on status
      if (status === "shipped") {
        updateData.shipped_at = new Date().toISOString();
      } else if (status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) throw updateError;

      toast({
        title: "Status Updated",
        description: `Order status changed to ${status}`,
      });

      await fetchOrders();
    } catch (err) {
      console.error("Error updating order status:", err);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateFulfillmentStatus = async (orderId: string, fulfillmentStatus: FulfillmentStatus) => {
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ fulfillment_status: fulfillmentStatus })
        .eq("id", orderId);

      if (updateError) throw updateError;

      toast({
        title: "Fulfillment Updated",
        description: `Fulfillment status changed to ${fulfillmentStatus}`,
      });

      await fetchOrders();
    } catch (err) {
      console.error("Error updating fulfillment status:", err);
      toast({
        title: "Error",
        description: "Failed to update fulfillment status",
        variant: "destructive",
      });
      throw err;
    }
  };

  const fulfillOrderItem = async (itemId: string, quantity: number) => {
    try {
      const { data: item, error: fetchError } = await supabase
        .from("order_items")
        .select("*, order:orders(*)")
        .eq("id", itemId)
        .single();

      if (fetchError) throw fetchError;

      const newFulfilledQty = Math.min(
        (item.fulfilled_quantity || 0) + quantity,
        item.quantity
      );

      const { error: updateError } = await supabase
        .from("order_items")
        .update({ fulfilled_quantity: newFulfilledQty })
        .eq("id", itemId);

      if (updateError) throw updateError;

      // Check if all items are fulfilled
      const { data: allItems } = await supabase
        .from("order_items")
        .select("quantity, fulfilled_quantity")
        .eq("order_id", item.order_id);

      if (allItems) {
        const totalQty = allItems.reduce((sum, i) => sum + i.quantity, 0);
        const totalFulfilled = allItems.reduce(
          (sum, i) => sum + (i.fulfilled_quantity || 0),
          0
        );

        let newFulfillmentStatus: FulfillmentStatus = "unfulfilled";
        if (totalFulfilled >= totalQty) {
          newFulfillmentStatus = "fulfilled";
        } else if (totalFulfilled > 0) {
          newFulfillmentStatus = "partial";
        }

        await updateFulfillmentStatus(item.order_id, newFulfillmentStatus);
      }

      toast({
        title: "Item Fulfilled",
        description: `Fulfilled ${quantity} unit(s)`,
      });

      await fetchOrders();
    } catch (err) {
      console.error("Error fulfilling item:", err);
      toast({
        title: "Error",
        description: "Failed to fulfill item",
        variant: "destructive",
      });
      throw err;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "cancelled" as OrderStatus })
        .eq("id", orderId);

      if (updateError) throw updateError;

      toast({
        title: "Order Cancelled",
        description: "The order has been cancelled",
      });

      await fetchOrders();
    } catch (err) {
      console.error("Error cancelling order:", err);
      toast({
        title: "Error",
        description: "Failed to cancel order",
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    fetchOrderItems,
    createOrder,
    updateOrderStatus,
    updateFulfillmentStatus,
    fulfillOrderItem,
    cancelOrder,
  };
}
