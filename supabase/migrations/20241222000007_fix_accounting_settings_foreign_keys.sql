/*
  # Fix accounting_settings foreign key constraints
  
  This migration fixes the foreign key constraints in the accounting_settings table
  to work with the new dual-account system (userDefinedAccounts + systemAccounts).
  
  1. Issues to fix:
    - Foreign keys still reference old "Account" table (now "userDefinedAccounts")
    - Need to support references to both userDefinedAccounts and systemAccounts
    - Current constraints prevent saving when account IDs exist in systemAccounts
  
  2. Solution:
    - Drop existing foreign key constraints
    - Create check constraints that allow references to either table
    - Add validation functions similar to Transaction table approach
*/

-- Drop all existing foreign key constraints that reference the old Account table
ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "accounting_settings_sales_revenue_account_fkey";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "accounting_settings_purchases_account_fkey";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "accounting_settings_discounts_account_fkey";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "accounting_settings_accounts_receivable_account_fkey";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "accounting_settings_accounts_payable_account_fkey";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "accounting_settings_taxes_payable_account_fkey";

ALTER TABLE "accounting_settings" 
DROP CONSTRAINT IF EXISTS "accounting_settings_retained_earnings_account_fkey";

-- We can reuse the existing check_account_exists function that was created for Transaction table
-- This function already checks both userDefinedAccounts and systemAccounts tables

-- Add check constraints for each account field using the existing function
ALTER TABLE "accounting_settings"
ADD CONSTRAINT "accounting_settings_sales_revenue_account_check" 
CHECK (sales_revenue_account IS NULL OR check_account_exists(sales_revenue_account));

ALTER TABLE "accounting_settings"
ADD CONSTRAINT "accounting_settings_purchases_account_check" 
CHECK (purchases_account IS NULL OR check_account_exists(purchases_account));

ALTER TABLE "accounting_settings"
ADD CONSTRAINT "accounting_settings_discounts_account_check" 
CHECK (discounts_account IS NULL OR check_account_exists(discounts_account));

ALTER TABLE "accounting_settings"
ADD CONSTRAINT "accounting_settings_accounts_receivable_account_check" 
CHECK (accounts_receivable_account IS NULL OR check_account_exists(accounts_receivable_account));

ALTER TABLE "accounting_settings"
ADD CONSTRAINT "accounting_settings_accounts_payable_account_check" 
CHECK (accounts_payable_account IS NULL OR check_account_exists(accounts_payable_account));

ALTER TABLE "accounting_settings"
ADD CONSTRAINT "accounting_settings_taxes_payable_account_check" 
CHECK (taxes_payable_account IS NULL OR check_account_exists(taxes_payable_account));

ALTER TABLE "accounting_settings"
ADD CONSTRAINT "accounting_settings_retained_earnings_account_check" 
CHECK (retained_earnings_account IS NULL OR check_account_exists(retained_earnings_account));

-- Add comments to document the constraints
COMMENT ON CONSTRAINT "accounting_settings_sales_revenue_account_check" ON "accounting_settings" 
IS 'Ensures sales_revenue_account references either userDefinedAccounts or systemAccounts table';

COMMENT ON CONSTRAINT "accounting_settings_purchases_account_check" ON "accounting_settings" 
IS 'Ensures purchases_account references either userDefinedAccounts or systemAccounts table';

COMMENT ON CONSTRAINT "accounting_settings_discounts_account_check" ON "accounting_settings" 
IS 'Ensures discounts_account references either userDefinedAccounts or systemAccounts table';

COMMENT ON CONSTRAINT "accounting_settings_accounts_receivable_account_check" ON "accounting_settings" 
IS 'Ensures accounts_receivable_account references either userDefinedAccounts or systemAccounts table';

COMMENT ON CONSTRAINT "accounting_settings_accounts_payable_account_check" ON "accounting_settings" 
IS 'Ensures accounts_payable_account references either userDefinedAccounts or systemAccounts table';

COMMENT ON CONSTRAINT "accounting_settings_taxes_payable_account_check" ON "accounting_settings" 
IS 'Ensures taxes_payable_account references either userDefinedAccounts or systemAccounts table';

COMMENT ON CONSTRAINT "accounting_settings_retained_earnings_account_check" ON "accounting_settings" 
IS 'Ensures retained_earnings_account references either userDefinedAccounts or systemAccounts table';

-- Log the completion
DO $$ 
BEGIN
  RAISE NOTICE 'Successfully updated accounting_settings foreign key constraints';
  RAISE NOTICE 'All account reference fields now support both userDefinedAccounts and systemAccounts tables';
END $$; 