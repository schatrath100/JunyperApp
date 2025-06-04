/*
  # Add user_id and RLS to SalesInvoice table

  1. Changes
    - Add user_id column to SalesInvoice table
    - Add foreign key constraint to auth.users
    - Update RLS policies to filter by user_id

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - View only their own invoices
      - Insert invoices with their user_id
      - Update only their own invoices
      - Delete only their own invoices
*/

-- Add user_id column
ALTER TABLE "SalesInvoice"
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX sales_invoice_user_id_idx ON "SalesInvoice"(user_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all invoices" ON "SalesInvoice";
DROP POLICY IF EXISTS "Users can insert invoices" ON "SalesInvoice";
DROP POLICY IF EXISTS "Users can update invoices" ON "SalesInvoice";
DROP POLICY IF EXISTS "Users can delete invoices" ON "SalesInvoice";

-- Create new policies
CREATE POLICY "Users can view own invoices"
ON "SalesInvoice"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
ON "SalesInvoice"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
ON "SalesInvoice"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
ON "SalesInvoice"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);