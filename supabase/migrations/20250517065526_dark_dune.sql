/*
  # Update transaction_date column

  1. Changes
    - Modify transaction_date column to ensure it's a date type with NOT NULL constraint
    - Set default value to CURRENT_DATE
*/

DO $$ 
BEGIN
  -- Update column type and constraints if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'Transaction'
    AND column_name = 'transaction_date'
    AND (data_type != 'date' OR is_nullable = 'YES')
  ) THEN
    ALTER TABLE "Transaction"
    ALTER COLUMN transaction_date TYPE date USING transaction_date::date,
    ALTER COLUMN transaction_date SET NOT NULL,
    ALTER COLUMN transaction_date SET DEFAULT CURRENT_DATE;
  END IF;
END $$;