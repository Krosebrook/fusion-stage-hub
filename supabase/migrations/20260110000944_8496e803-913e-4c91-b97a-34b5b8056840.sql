-- Create product-media storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-media', 'product-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for product media uploads (org-based access)
CREATE POLICY "Product media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

CREATE POLICY "Org members can upload product media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-media');

CREATE POLICY "Org members can update product media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-media');

CREATE POLICY "Org members can delete product media"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-media');