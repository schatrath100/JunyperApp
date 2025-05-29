/*
  # Add Status Column to Transaction Table

  1. Changes
    - Add Status column to Transaction table
    - Add check constraint to ensure valid status values
    - Make Status column nullable to maintain compatibility with existing records

  2. Notes
    - Status values match those from SalesInvoice table
    - Column is nullable to avoid issues with existing records
*/

ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "Status" text CHECK ("Status" IN ('Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'));