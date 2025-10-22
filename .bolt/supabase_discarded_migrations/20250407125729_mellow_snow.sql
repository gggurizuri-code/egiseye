/*
  # Create storage bucket for avatars

  1. New Storage
    - Create public bucket for avatars
    - Enable public access
    - Add storage policies
*/

-- Create public storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload avatars
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() = owner
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() = owner
);

-- Allow public access to avatar files
CREATE POLICY "Allow public access to avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');