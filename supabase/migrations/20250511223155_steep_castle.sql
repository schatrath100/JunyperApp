/*
  # Add ItemID column to SalesInvoice table

  1. Changes
    - Add ItemID column to SalesInvoice table as numeric type
    - Make it nullable to maintain compatibility with existing records
*/

ALTER TABLE "SalesInvoice"
ADD COLUMN IF NOT EXISTS "ItemID" numeric;