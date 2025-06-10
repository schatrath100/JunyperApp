/*
  # Fix bank_transactions date column type

  1. Changes
    - Ensure bank_transactions.date is properly set to timestamptz
    - This allows for more precise timestamp storage with timezone information
*/

-- First, ensure we have a backup of the data
CREATE TABLE IF NOT EXISTS bank_transactions_backup AS 
SELECT * FROM bank_transactions;

-- Update the date column to timestamptz
ALTER TABLE bank_transactions
ALTER COLUMN date TYPE timestamptz USING date::timestamptz;

-- Add a comment to the column for clarity
COMMENT ON COLUMN bank_transactions.date IS 'Transaction date with timezone information'; 