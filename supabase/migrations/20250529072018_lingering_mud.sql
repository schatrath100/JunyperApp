/*
  # Create VendorInvoice table and policies

  1. New Tables
    - VendorInvoice
      - id (bigint, primary key)
      - created_at (timestamptz)
      - BillNo (text, unique)
      - BillDate (date)
      - Vendor_name (text, references Vendor)
      - Description (text)
      - Amount (numeric)
      - Status (text with check constraint)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - View all bills
      - Insert bills
      - Update bills
      - Delete bills
*/

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS "VendorInvoice" (
  id bigint PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  "BillNo" text UNIQUE NOT NULL,
  "BillDate" date NOT NULL,
  "Vendor_name" text NOT NULL REFERENCES "Vendor"(vendor_name),
  "Description" text,
  "Amount" numeric NOT NULL,
  "Status" text NOT NULL DEFAULT 'Pending' CHECK ("Status" IN ('Pending', 'Paid', 'Cancelled', 'Overdue'))
);

-- Enable RLS
ALTER TABLE "VendorInvoice" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view all bills" ON "VendorInvoice";
  DROP POLICY IF EXISTS "Users can insert bills" ON "VendorInvoice";
  DROP POLICY IF EXISTS "Users can update bills" ON "VendorInvoice";
  DROP POLICY IF EXISTS "Users can delete bills" ON "VendorInvoice";
END $$;

-- Create policies
CREATE POLICY "Users can view all bills"
  ON "VendorInvoice"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert bills"
  ON "VendorInvoice"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update bills"
  ON "VendorInvoice"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete bills"
  ON "VendorInvoice"
  FOR DELETE
  TO authenticated
  USING (true);
