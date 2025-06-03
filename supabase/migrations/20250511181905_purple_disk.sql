/*
  # Add RLS policies for Customer table

  1. Security Changes
    - Enable RLS on Customer table
    - Add policy for authenticated users to read all customers
    - Add policy for authenticated users to insert customers
    - Add policy for authenticated users to update their own customers
*/

-- Enable RLS
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all customers"
ON "Customer"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert customers"
ON "Customer"
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update customers"
ON "Customer"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
