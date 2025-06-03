/*
  # Add RLS policies for PurchaseItems table

  1. Security
    - Enable RLS on PurchaseItems table
    - Add policies for CRUD operations
    - Only authenticated users can access the table
*/

-- Enable RLS if not already enabled
ALTER TABLE "PurchaseItems" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view all purchase items" ON "PurchaseItems";
    DROP POLICY IF EXISTS "Users can insert purchase items" ON "PurchaseItems";
    DROP POLICY IF EXISTS "Users can update purchase items" ON "PurchaseItems";
    DROP POLICY IF EXISTS "Users can delete purchase items" ON "PurchaseItems";
END $$;

-- Create policies
CREATE POLICY "Users can view all purchase items"
  ON "PurchaseItems"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert purchase items"
  ON "PurchaseItems"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update purchase items"
  ON "PurchaseItems"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete purchase items"
  ON "PurchaseItems"
  FOR DELETE
  TO authenticated
  USING (true);
