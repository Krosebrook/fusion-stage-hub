-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

-- Create fulfillment_status enum
CREATE TYPE public.fulfillment_status AS ENUM (
  'unfulfilled',
  'partial',
  'fulfilled'
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  external_id TEXT,
  order_number TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'unfulfilled',
  customer_email TEXT,
  customer_name TEXT,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  billing_address JSONB DEFAULT '{}'::jsonb,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  shipping NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table for detailed tracking
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.variants(id) ON DELETE SET NULL,
  sku TEXT,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  fulfilled_quantity INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for orders
CREATE POLICY "Members can view orders"
ON public.orders
FOR SELECT
USING (is_org_member(org_id, auth.uid()));

CREATE POLICY "Writers can manage orders"
ON public.orders
FOR ALL
USING (can_write_org(org_id, auth.uid()));

-- RLS policies for order_items
CREATE POLICY "Members can view order items"
ON public.order_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = order_items.order_id
  AND is_org_member(o.org_id, auth.uid())
));

CREATE POLICY "Writers can manage order items"
ON public.order_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = order_items.order_id
  AND can_write_org(o.org_id, auth.uid())
));

-- Enable realtime for orders, approvals, jobs, and stores
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;

-- Create indexes for better performance
CREATE INDEX idx_orders_org_id ON public.orders(org_id);
CREATE INDEX idx_orders_store_id ON public.orders(store_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_placed_at ON public.orders(placed_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Create updated_at trigger for orders
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();