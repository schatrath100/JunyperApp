/*
  # Add vendor bill attachments support

  1. Changes
    - Create private storage bucket for vendor bill files
    - Add RLS policies for authenticated users to:
      - Upload files to the vendorbills bucket
      - Read files from the vendorbills bucket
      - Delete files from the vendorbills bucket

  2. Notes
    - File size validation will be handled at the application level
    - The bucket is private (not publicly accessible)
*/

-- Create bucket for vendor bill files if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'vendorbills'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('vendorbills', 'vendorbills', false);
  END IF;
END $$;

-- Enable RLS policies for file access
DO $$
BEGIN
  -- Policy for uploading files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload vendor bill files'
  ) THEN
    CREATE POLICY "Users can upload vendor bill files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'vendorbills');
  END IF;

  -- Policy for reading files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can read vendor bill files'
  ) THEN
    CREATE POLICY "Users can read vendor bill files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'vendorbills');
  END IF;

  -- Policy for deleting files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete vendor bill files'
  ) THEN
    CREATE POLICY "Users can delete vendor bill files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'vendorbills');
  END IF;
END $$;
