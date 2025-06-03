/*
  # Add transaction date column

  1. Changes
    - Add transaction_date column to Transaction table
    - Set default value to current date
    - Make column non-nullable
*/

ALTER TABLE "Transaction"
ADD COLUMN transaction_date date NOT NULL DEFAULT CURRENT_DATE;
