-- ============================================================
-- Question Images Migration
-- Run this in the Supabase SQL editor to add image support
-- ============================================================

-- Add question image column (image displayed alongside the question text)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_image_url TEXT;

-- Add answer images column (JSONB mapping choice index or key to image URLs)
-- For multiple_choice: { "0": "url", "1": "url", ... } keyed by choice index
-- For written: { "sample_answer": "url" }
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_images JSONB;

-- ============================================================
-- Storage Policies for question-images bucket
-- ============================================================

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images');

-- Allow anyone to read the images
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'question-images');

-- Allow authenticated users to delete images (if they replace/remove)
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'question-images');
