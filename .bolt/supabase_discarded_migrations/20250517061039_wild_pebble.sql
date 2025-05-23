/*
  # Add account type column if not exists

  1. Changes
    - Add account_type column to Account table if it doesn't exist
    - Add comment to describe the column purpose
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'Account' 
    AND column_name = 'account_type'
  ) THEN
    ALTER TABLE "Account"
    ADD COLUMN account_type text COMMENT 'account type';
  END IF;
END $$;