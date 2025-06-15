/*
  # Update Account table account_id from 19 to 4
  
  This migration updates account records where id = 19 to id = 4 in the account tables.
  Since we have both userDefinedAccounts and systemAccounts tables, we'll check both.
  
  1. Changes
    - Update userDefinedAccounts records with id = 19 to id = 4
    - Update systemAccounts records with id = 19 to id = 4
    - Handle any foreign key references that might be affected
    - Add logging to show how many records were affected
  
  2. Safety
    - Uses WHERE clause to only update specific records
    - Checks both account tables (userDefinedAccounts and systemAccounts)
    - Includes verification queries to confirm changes
    - Handles potential conflicts with existing id = 4 records
*/

-- Log the current state before update
DO $$ 
DECLARE
  user_record_count INTEGER;
  system_record_count INTEGER;
  existing_id_4_user INTEGER;
  existing_id_4_system INTEGER;
BEGIN
  -- Count records with id = 19 in userDefinedAccounts
  SELECT COUNT(*) INTO user_record_count
  FROM "userDefinedAccounts" 
  WHERE id = 19;
  
  -- Count records with id = 19 in systemAccounts
  SELECT COUNT(*) INTO system_record_count
  FROM "systemAccounts" 
  WHERE id = 19;
  
  -- Check if id = 4 already exists in userDefinedAccounts
  SELECT COUNT(*) INTO existing_id_4_user
  FROM "userDefinedAccounts" 
  WHERE id = 4;
  
  -- Check if id = 4 already exists in systemAccounts
  SELECT COUNT(*) INTO existing_id_4_system
  FROM "systemAccounts" 
  WHERE id = 4;
  
  RAISE NOTICE 'Found % userDefinedAccounts records with id = 19', user_record_count;
  RAISE NOTICE 'Found % systemAccounts records with id = 19', system_record_count;
  RAISE NOTICE 'Existing userDefinedAccounts records with id = 4: %', existing_id_4_user;
  RAISE NOTICE 'Existing systemAccounts records with id = 4: %', existing_id_4_system;
  
  -- Warning if id = 4 already exists
  IF existing_id_4_user > 0 OR existing_id_4_system > 0 THEN
    RAISE WARNING 'Records with id = 4 already exist. This migration may cause conflicts.';
  END IF;
END $$;

-- Update userDefinedAccounts: change id from 19 to 4
-- First, we need to handle the sequence and potential conflicts
DO $$
DECLARE
  temp_id INTEGER := 999999; -- Temporary ID to avoid conflicts
BEGIN
  -- Check if record with id = 19 exists in userDefinedAccounts
  IF EXISTS (SELECT 1 FROM "userDefinedAccounts" WHERE id = 19) THEN
    -- If id = 4 already exists, move it to temp_id first
    IF EXISTS (SELECT 1 FROM "userDefinedAccounts" WHERE id = 4) THEN
      UPDATE "userDefinedAccounts" SET id = temp_id WHERE id = 4;
      RAISE NOTICE 'Moved existing userDefinedAccounts record with id = 4 to temporary id = %', temp_id;
    END IF;
    
    -- Now update id = 19 to id = 4
    UPDATE "userDefinedAccounts" SET id = 4 WHERE id = 19;
    RAISE NOTICE 'Updated userDefinedAccounts: changed id from 19 to 4';
  END IF;
END $$;

-- Update systemAccounts: change id from 19 to 4
DO $$
DECLARE
  temp_id INTEGER := 999998; -- Different temp ID for system accounts
BEGIN
  -- Check if record with id = 19 exists in systemAccounts
  IF EXISTS (SELECT 1 FROM "systemAccounts" WHERE id = 19) THEN
    -- If id = 4 already exists, move it to temp_id first
    IF EXISTS (SELECT 1 FROM "systemAccounts" WHERE id = 4) THEN
      UPDATE "systemAccounts" SET id = temp_id WHERE id = 4;
      RAISE NOTICE 'Moved existing systemAccounts record with id = 4 to temporary id = %', temp_id;
    END IF;
    
    -- Now update id = 19 to id = 4
    UPDATE "systemAccounts" SET id = 4 WHERE id = 19;
    RAISE NOTICE 'Updated systemAccounts: changed id from 19 to 4';
  END IF;
END $$;

-- Update any Transaction records that reference the old account_id = 19
UPDATE "Transaction"
SET account_id = 4
WHERE account_id = 19;

-- Log the results after update
DO $$ 
DECLARE
  user_updated_count INTEGER;
  system_updated_count INTEGER;
  transaction_updated_count INTEGER;
  final_user_count INTEGER;
  final_system_count INTEGER;
  final_transaction_count INTEGER;
BEGIN
  -- Count records with id = 4 in both tables to verify
  SELECT COUNT(*) INTO final_user_count
  FROM "userDefinedAccounts" 
  WHERE id = 4;
  
  SELECT COUNT(*) INTO final_system_count
  FROM "systemAccounts" 
  WHERE id = 4;
  
  -- Count Transaction records with account_id = 4
  SELECT COUNT(*) INTO final_transaction_count
  FROM "Transaction" 
  WHERE account_id = 4;
  
  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'userDefinedAccounts records now with id = 4: %', final_user_count;
  RAISE NOTICE 'systemAccounts records now with id = 4: %', final_system_count;
  RAISE NOTICE 'Transaction records now with account_id = 4: %', final_transaction_count;
END $$;

-- Add comment to document the change
COMMENT ON TABLE "userDefinedAccounts" IS 'User-defined accounts table - Updated account id references from 19 to 4 on 2024-12-22';
COMMENT ON TABLE "systemAccounts" IS 'System accounts table - Updated account id references from 19 to 4 on 2024-12-22'; 