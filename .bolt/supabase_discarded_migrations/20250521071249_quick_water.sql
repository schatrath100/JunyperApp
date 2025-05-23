/*
  # Add RLS policies for PurchaseItems table

  1. Security
    - Enable RLS on PurchaseItems table
    - Add policies for authenticated users to:
      - View all purchase items
      - Insert new purchase items
      - Update existing purchase items
      - Delete purchase items
*/

-- Enable RLS
ALTER TABLE "PurchaseItems" ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT operations
CREATE POLICY "Users can view all purchase items"
  ON "PurchaseItems"
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for INSERT operations
CREATE POLICY "Users can insert purchase items"
  ON "PurchaseItems"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for UPDATE operations
CREATE POLICY "Users can update purchase items"
  ON "PurchaseItems"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for DELETE operations
CREATE POLICY "Users can delete purchase items"
  ON "PurchaseItems"
  FOR DELETE
  TO authenticated
  USING (true);