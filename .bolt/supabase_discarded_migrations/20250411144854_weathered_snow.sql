/*
  # Add photo support to forum posts

  1. Changes
    - Add photo_url column to forum_posts table
    - Create storage bucket for forum photos
    - Add storage policies for forum photos
*/

-- Add photo_url column to forum_posts
ALTER TABLE forum_posts
ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for forum photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-photos', 'forum-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload forum photos
CREATE POLICY "Allow authenticated users to upload forum photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'forum-photos' AND
  auth.uid() = owner
);

-- Allow authenticated users to update their own forum photos
CREATE POLICY "Allow users to update their own forum photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'forum-photos' AND
  auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'forum-photos' AND
  auth.uid() = owner
);

-- Allow public access to forum photos
CREATE POLICY "Allow public access to forum photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'forum-photos');