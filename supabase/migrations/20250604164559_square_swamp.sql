/*
  # Fix VendorInvoice ID generation
  
  1. Changes
    - Create sequence for VendorInvoice IDs
    - Set default value for id column to use sequence
    - Update existing records to use sequence
*/

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS vendor_invoice_id_seq;

-- Set the sequence to start after the highest existing ID
SELECT setval('vendor_invoice_id_seq', COALESCE((SELECT MAX(id) FROM "VendorInvoice"), 0));

-- Modify the id column to use the sequence
ALTER TABLE "VendorInvoice" 
ALTER COLUMN id SET DEFAULT nextval('vendor_invoice_id_seq');

-- Add comment
COMMENT ON SEQUENCE vendor_invoice_id_seq IS 'Sequence for VendorInvoice IDs';