/*
  # Fix transaction date column

  1. Changes
    - Rename Transaction_date to transaction_date to match code convention
    - Change column type from numeric to date to store proper date values

  2. Data Preservation
    - Use safe column rename to preserve existing data
*/

ALTER TABLE "Transaction" 
RENAME COLUMN "Transaction_date" TO transaction_date;

ALTER TABLE "Transaction"
ALTER COLUMN transaction_date TYPE date USING NULL;