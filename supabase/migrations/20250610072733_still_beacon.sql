/*
  # Add last_updated_at column to VendorInvoice table

  1. Changes
    - Add last_updated_at column to VendorInvoice table (if it doesn't exist)
    - Create trigger function to automatically update the timestamp
    - Add trigger to update last_updated_at on record updates
    - Add column comment for documentation

  2. Security
    - No RLS changes needed as this is just adding a timestamp column
*/

-- Add last_updated_at column only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'VendorInvoice' AND column_name = 'last_updated_at'
  ) THEN
    ALTER TABLE "VendorInvoice" 
    ADD COLUMN "last_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_vendor_invoice_last_updated_at ON "VendorInvoice";

CREATE TRIGGER update_vendor_invoice_last_updated_at
    BEFORE UPDATE ON "VendorInvoice"
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_at();

-- Add comment to the column
COMMENT ON COLUMN "VendorInvoice"."last_updated_at" IS 'Timestamp of the last update to this record';