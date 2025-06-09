/*
  # Add ItemID column to SalesInvoice table

  1. Changes
    - Add ItemID column to SalesInvoice table as numeric type
    - Make it nullable to maintain compatibility with existing records
*/

ALTER TABLE "SalesInvoice"
ADD COLUMN IF NOT EXISTS "ItemID" numeric;

/*
  # Change InvoiceDate to timestamptz in SalesInvoice table

  1. Changes
    - Change InvoiceDate column type from date to timestamptz
    - This allows for more precise timestamp storage with timezone information
*/

ALTER TABLE "SalesInvoice"
ALTER COLUMN "InvoiceDate" TYPE timestamptz USING "InvoiceDate"::timestamptz;
