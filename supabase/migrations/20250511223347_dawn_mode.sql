/*
  # Add OutstandingAmount column to SalesInvoice table

  1. Changes
    - Add `OutstandingAmount` column to `SalesInvoice` table
      - Type: numeric (to match other amount columns)
      - Nullable: true (to maintain compatibility with existing records)
      - Default: NULL

  2. Notes
    - This migration adds support for tracking outstanding amounts on invoices
    - The column is made nullable to ensure compatibility with existing records
    - No data migration is needed as new records will handle this field through the application
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'SalesInvoice' 
    AND column_name = 'OutstandingAmount'
  ) THEN
    ALTER TABLE "SalesInvoice"
    ADD COLUMN "OutstandingAmount" numeric;
  END IF;
END $$;