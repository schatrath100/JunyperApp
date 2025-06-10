-- Add last_updated_at column to VendorInvoice table
ALTER TABLE "VendorInvoice" 
ADD COLUMN "last_updated_at" timestamptz DEFAULT CURRENT_TIMESTAMP;

-- Add trigger to automatically update last_updated_at
CREATE OR REPLACE FUNCTION update_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendor_invoice_last_updated_at
    BEFORE UPDATE ON "VendorInvoice"
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_at();

-- Add comment to the column
COMMENT ON COLUMN "VendorInvoice"."last_updated_at" IS 'Timestamp of the last update to this record'; 