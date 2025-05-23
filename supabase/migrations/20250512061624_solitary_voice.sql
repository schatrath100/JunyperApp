/*
  # Add download policy for invoice files

  1. Security Changes
    - Add policy to allow authenticated users to download files from invoicefiles bucket
*/

-- Enable RLS policies for file download
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can download invoice files'
  ) THEN
    CREATE POLICY "Users can download invoice files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'invoicefiles');
  END IF;
END $$;