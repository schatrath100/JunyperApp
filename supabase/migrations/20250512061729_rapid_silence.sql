/*
  # Fix storage policies for invoice files

  1. Security Changes
    - Add policies to allow authenticated users to download files
    - Add policy for file updates
    - Add policy for file deletions
*/

-- Enable RLS policies for file operations
DO $$
BEGIN
  -- Policy for downloading files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can download invoice files'
  ) THEN
    CREATE POLICY "Users can download invoice files"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'invoicefiles');
  END IF;

  -- Policy for updating files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update invoice files'
  ) THEN
    CREATE POLICY "Users can update invoice files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'invoicefiles');
  END IF;

  -- Policy for deleting files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete invoice files'
  ) THEN
    CREATE POLICY "Users can delete invoice files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'invoicefiles');
  END IF;
END $$;
