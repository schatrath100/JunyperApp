/*
  # Add payment terms to Customer table

  1. Changes
    - Add Customer_PaymentTerms column to Customer table
*/

ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "Customer_PaymentTerms" text DEFAULT ''::text;