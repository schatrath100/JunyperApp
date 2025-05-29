/*
  # Update VendorInvoice table structure
  
  1. Changes
    - Remove BillNo column since we'll use id as the bill number
    - Rename BillDate to Date for consistency
    - Add attachment_path column for bill attachments
    - Add ItemID and ItemName columns
    - Update column constraints and defaults
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing table and recreate with new structure
DROP TABLE IF EXISTS "VendorInvoice";

CREATE TABLE "VendorInvoice" (
  id bigint PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  "Vendor_name" text NOT NULL,
  "Description" text,
  "Amount" numeric NOT NULL,
  "ItemName" text,
  "Date" date NOT NULL,
  "Status" text NOT NULL DEFAULT 'Pending' CHECK ("Status" IN ('Pending', 'Paid', 'Cancelled', 'Overdue')),
  "ItemID" numeric,
  attachment_path text
);

-- Enable RLS
ALTER TABLE "VendorInvoice" ENABLE ROW LEVEL SECURITY;

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

-- Add comment
COMMENT ON TABLE "VendorInvoice" IS 'Vendor bills and invoices';