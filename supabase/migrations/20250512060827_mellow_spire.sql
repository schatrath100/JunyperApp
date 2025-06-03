/*
  # Add invoice attachment support

  1. Changes
    - Add attachment_path column to SalesInvoice table
    - Create private storage bucket for invoice files
    - Add RLS policies for authenticated users to:
      - Upload files to the invoicefiles bucket
      - Read files from the invoicefiles bucket

  2. Notes
    - File size validation will be handled at the application level
    - The bucket is private (not publicly accessible)
*/

-- Add attachment path column
ALTER TABLE "SalesInvoice"
ADD COLUMN IF NOT EXISTS attachment_path text;

-- Create bucket for invoice files if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'invoicefiles'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('invoicefiles', 'invoicefiles', false);
  END IF;
END $$;

-- Enable RLS policies for file access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload invoice files'
  ) THEN
    CREATE POLICY "Users can upload invoice files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'invoicefiles');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can read invoice files'
  ) THEN
    CREATE POLICY "Users can read invoice files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'invoicefiles');
  END IF;
END $$;
