/*
  # Add RLS policies for Transaction table

  1. Security Changes
    - Enable RLS on Transaction table
    - Add policies for authenticated users to:
      - Insert transactions
      - Read transactions
      - Update transactions
      - Delete transactions
    
  2. Notes
    - All authenticated users can manage transactions
    - This is necessary for invoice creation functionality
*/

-- Enable RLS on Transaction table
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

-- Policy for inserting transactions
CREATE POLICY "Users can insert transactions"
ON "Transaction"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for reading transactions
CREATE POLICY "Users can read transactions"
ON "Transaction"
FOR SELECT
TO authenticated
USING (true);

-- Policy for updating transactions
CREATE POLICY "Users can update transactions"
ON "Transaction"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for deleting transactions
CREATE POLICY "Users can delete transactions"
ON "Transaction"
FOR DELETE
TO authenticated
USING (true);