/*
  # Update remaining date fields to timestamptz

  1. Changes
    - Change bank_transactions.date from date to timestamptz
    - Change VendorInvoice.Date from date to timestamptz
    - This allows for more precise timestamp storage with timezone information
*/

-- Update bank_transactions.date
ALTER TABLE bank_transactions
ALTER COLUMN date TYPE timestamptz USING date::timestamptz;

-- Update VendorInvoice.Date
ALTER TABLE "VendorInvoice"
ALTER COLUMN "Date" TYPE timestamptz USING "Date"::timestamptz; 