/*
  # Create avatars storage bucket

  1. Changes
    - Create public storage bucket for avatar images
    - Add RLS policies for authenticated users to:
      - Upload files to the avatars bucket
      - Read files from the avatars bucket
      - Delete files from the avatars bucket

  2. Notes
    - The bucket is public to allow direct access to avatar images
    - File size validation will be handled at the application level
*/

-- First, ensure the storage extension is enabled
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "extensions";

-- Create bucket for avatar images if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true);
  END IF;
END $$;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read avatar files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatar files" ON storage.objects;

-- Create new policies
CREATE POLICY "Users can upload avatar files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can read avatar files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete avatar files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
); 