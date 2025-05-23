/*
  # Add RLS policies for Vendor table

  1. Security
    - Enable RLS on Vendor table
    - Add policies for CRUD operations:
      - Select: Authenticated users can view all vendors
      - Insert: Authenticated users can add vendors
      - Update: Authenticated users can update vendors
      - Delete: Authenticated users can delete vendors

  2. Changes
    - Enable RLS
    - Add policies for all operations
*/

-- Enable RLS
ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT operations
CREATE POLICY "Users can view all vendors"
  ON "Vendor"
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for INSERT operations
CREATE POLICY "Users can insert vendors"
  ON "Vendor"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for UPDATE operations
CREATE POLICY "Users can update vendors"
  ON "Vendor"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for DELETE operations
CREATE POLICY "Users can delete vendors"
  ON "Vendor"
  FOR DELETE
  TO authenticated
  USING (true);