/*
  # Update transaction_date column

  1. Changes
    - Modify transaction_date column to store timestamp information
    - Set default value to CURRENT_TIMESTAMP
*/

DO $$ 
BEGIN
  -- Update column type and constraints if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'Transaction'
    AND column_name = 'transaction_date'
    AND (data_type != 'timestamptz' OR is_nullable = 'YES')
  ) THEN
    ALTER TABLE "Transaction"
    ALTER COLUMN transaction_date TYPE timestamptz USING transaction_date::timestamptz,
    ALTER COLUMN transaction_date SET NOT NULL,
    ALTER COLUMN transaction_date SET DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
