/*
  # Update Transaction table account_id from 19 to 4
  
  This migration updates all Transaction records where account_id = 19 to account_id = 4.
  This is needed to correct account references in the Transaction table.
  
  1. Changes
    - Update Transaction records with account_id = 19 to account_id = 4
    - Add logging to show how many records were affected
  
  2. Safety
    - Uses WHERE clause to only update specific records
    - Includes verification query to confirm changes
    - Logs before and after state for transparency
*/

-- Log the current state before update
DO $$ 
DECLARE
  record_count INTEGER;
BEGIN
  -- Count records with account_id = 19
  SELECT COUNT(*) INTO record_count
  FROM "Transaction" 
  WHERE account_id = 19;
  
  RAISE NOTICE 'Found % Transaction records with account_id = 19', record_count;
END $$;

-- Update account_id from 19 to 4 in Transaction table
UPDATE "Transaction"
SET account_id = 4
WHERE account_id = 19;

-- Log the results after update
DO $$ 
DECLARE
  updated_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Get the number of affected rows from the previous UPDATE
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Count records with account_id = 4 to verify
  SELECT COUNT(*) INTO new_count
  FROM "Transaction" 
  WHERE account_id = 4;
  
  RAISE NOTICE 'Updated % Transaction records from account_id 19 to account_id 4', updated_count;
  RAISE NOTICE 'Total Transaction records now with account_id = 4: %', new_count;
END $$;

-- Verify no records with account_id = 19 remain
DO $$ 
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM "Transaction" 
  WHERE account_id = 19;
  
  IF remaining_count = 0 THEN
    RAISE NOTICE 'Migration successful: No Transaction records with account_id = 19 remain';
  ELSE
    RAISE WARNING 'Migration incomplete: % Transaction records with account_id = 19 still exist', remaining_count;
  END IF;
END $$;

-- Add comment to document the change
COMMENT ON TABLE "Transaction" IS 'Transaction table - Updated account_id references from 19 to 4 on 2024-12-22'; 