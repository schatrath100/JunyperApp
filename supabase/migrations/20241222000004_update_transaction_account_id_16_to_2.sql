/*
  # Update Transaction account_id from 16 to 2
  
  This migration updates all Transaction records where account_id = 16 to account_id = 2.
  This is needed to correct account references in the Transaction table.
  
  1. Changes
    - Update Transaction records with account_id = 16 to account_id = 2
    - Add logging to show how many records were affected
  
  2. Safety
    - Uses WHERE clause to only update specific records
    - Includes verification query to confirm changes
*/

-- Log the current state before update
DO $$ 
DECLARE
  record_count INTEGER;
BEGIN
  -- Count records with account_id = 16
  SELECT COUNT(*) INTO record_count
  FROM "Transaction" 
  WHERE account_id = 16;
  
  RAISE NOTICE 'Found % Transaction records with account_id = 16', record_count;
END $$;

-- Update account_id from 16 to 2
UPDATE "Transaction"
SET account_id = 2
WHERE account_id = 16;

-- Log the results after update
DO $$ 
DECLARE
  updated_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Get the number of affected rows from the previous UPDATE
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Count records with account_id = 2 to verify
  SELECT COUNT(*) INTO new_count
  FROM "Transaction" 
  WHERE account_id = 2;
  
  RAISE NOTICE 'Updated % Transaction records from account_id 16 to account_id 2', updated_count;
  RAISE NOTICE 'Total Transaction records now with account_id = 2: %', new_count;
END $$;

-- Add comment to document the change
COMMENT ON TABLE "Transaction" IS 'Transaction table - Updated account_id references from 16 to 2 on 2024-12-22'; 