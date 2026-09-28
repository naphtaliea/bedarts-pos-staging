-- Product images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload / replace / delete product images
CREATE POLICY "product_images_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_images_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

-- Public read (bucket is public, belt-and-suspenders)
CREATE POLICY "product_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
