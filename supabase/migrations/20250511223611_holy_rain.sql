/*
  # Add RLS policies for SalesInvoice table

  1. Security Changes
    - Enable RLS on SalesInvoice table
    - Add policy for authenticated users to read all invoices
    - Add policy for authenticated users to insert invoices
    - Add policy for authenticated users to update invoices
    - Add policy for authenticated users to delete invoices
*/

-- Enable RLS
ALTER TABLE "SalesInvoice" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all invoices"
ON "SalesInvoice"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert invoices"
ON "SalesInvoice"
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update invoices"
ON "SalesInvoice"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can delete invoices"
ON "SalesInvoice"
FOR DELETE
TO authenticated
USING (true);
