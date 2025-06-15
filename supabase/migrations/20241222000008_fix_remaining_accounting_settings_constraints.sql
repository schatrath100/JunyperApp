/*
  # Fix remaining accounting_settings foreign key constraints
  
  This migration fixes the remaining foreign key constraints that are still causing errors,
  specifically the cash_account field and any other constraints we missed.
  
  1. Issues to fix:
    - cash_account still has old foreign key constraint
    - Some constraints might have different names than expected
    - Need to ensure ALL account-related foreign keys are replaced
  
  2. Solution:
    - Drop ALL possible foreign key constraint variations
    - Add missing check constraints for cash_account
    - Ensure comprehensive coverage of all account fields
*/

-- Drop any remaining foreign key constraints with various possible names
-- These might exist with different naming conventions

-- Cash account constraints
ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "accounting_settings_cash_account_fkey";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "cash_account_fkey";

-- Check for any other possible constraint names and drop them
ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "fk_sales_revenue_account";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "fk_purchases_account";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "fk_accounts_receivable_account";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "fk_accounts_payable_account";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "fk_taxes_payable_account";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "fk_cash_account";

-- Add the missing check constraint for cash_account
ALTER TABLE "accounting_settings"
ADD CONSTRAINT "accounting_settings_cash_account_check" 
CHECK (cash_account IS NULL OR check_account_exists(cash_account));

-- Add comment for the cash_account constraint
COMMENT ON CONSTRAINT "accounting_settings_cash_account_check" ON "accounting_settings" 
IS 'Ensures cash_account references either userDefinedAccounts or systemAccounts table';

-- Verify all constraints are properly set up by listing them
DO $$ 
DECLARE
  constraint_count INTEGER;
BEGIN
  -- Count check constraints related to account fields
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints 
  WHERE table_name = 'accounting_settings' 
    AND constraint_type = 'CHECK'
    AND constraint_name LIKE '%_account_check';
  
  RAISE NOTICE 'Found % check constraints for account fields in accounting_settings', constraint_count;
  
  -- List any remaining foreign key constraints that might still exist
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints 
  WHERE table_name = 'accounting_settings' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%account%';
  
  IF constraint_count > 0 THEN
    RAISE WARNING 'Still found % foreign key constraints related to accounts - manual cleanup may be needed', constraint_count;
  ELSE
    RAISE NOTICE 'Successfully removed all account-related foreign key constraints';
  END IF;
END $$;

-- Final verification: Test that the check_account_exists function works
DO $$ 
BEGIN
  -- Test the function exists and works
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_account_exists') THEN
    RAISE NOTICE 'check_account_exists function is available and ready to use';
  ELSE
    RAISE EXCEPTION 'check_account_exists function is missing - this will cause constraint violations';
  END IF;
END $$; 