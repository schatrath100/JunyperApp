/*
  # Comprehensive cleanup of accounting_settings foreign key constraints
  
  This migration dynamically finds and removes ALL foreign key constraints
  on the accounting_settings table, then adds the proper check constraints.
  
  1. Dynamic approach:
    - Query information_schema to find all foreign key constraints
    - Generate and execute DROP statements for each constraint
    - Add all necessary check constraints
  
  2. Comprehensive coverage:
    - Handles any constraint naming convention
    - Ensures no foreign key constraints remain
    - Adds complete set of check constraints
*/

-- Step 1: Dynamically drop all foreign key constraints on accounting_settings table
DO $$
DECLARE
    constraint_record RECORD;
    drop_statement TEXT;
BEGIN
    -- Find all foreign key constraints on accounting_settings table
    FOR constraint_record IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'accounting_settings' 
          AND constraint_type = 'FOREIGN KEY'
    LOOP
        drop_statement := 'ALTER TABLE "accounting_settings" DROP CONSTRAINT IF EXISTS "' || constraint_record.constraint_name || '"';
        RAISE NOTICE 'Dropping constraint: %', constraint_record.constraint_name;
        EXECUTE drop_statement;
    END LOOP;
    
    RAISE NOTICE 'Completed dropping all foreign key constraints on accounting_settings table';
END $$;

-- Step 2: Add all necessary check constraints (including any we might have missed)
-- Drop existing check constraints first to avoid duplicates
ALTER TABLE "accounting_settings" DROP CONSTRAINT IF EXISTS "accounting_settings_sales_revenue_account_check";
ALTER TABLE "accounting_settings" DROP CONSTRAINT IF EXISTS "accounting_settings_purchases_account_check";
ALTER TABLE "accounting_settings" DROP CONSTRAINT IF EXISTS "accounting_settings_discounts_account_check";
ALTER TABLE "accounting_settings" DROP CONSTRAINT IF EXISTS "accounting_settings_accounts_receivable_account_check";
ALTER TABLE "accounting_settings" DROP CONSTRAINT IF EXISTS "accounting_settings_accounts_payable_account_check";
ALTER TABLE "accounting_settings" DROP CONSTRAINT IF EXISTS "accounting_settings_taxes_payable_account_check";
ALTER TABLE "accounting_settings" DROP CONSTRAINT IF EXISTS "accounting_settings_retained_earnings_account_check";
ALTER TABLE "accounting_settings" DROP CONSTRAINT IF EXISTS "accounting_settings_cash_account_check";

-- Add all check constraints
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

ALTER TABLE "accounting_settings"
ADD CONSTRAINT "accounting_settings_cash_account_check" 
CHECK (cash_account IS NULL OR check_account_exists(cash_account));

-- Step 3: Final verification and reporting
DO $$
DECLARE
    fk_count INTEGER;
    check_count INTEGER;
BEGIN
    -- Count remaining foreign key constraints
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'accounting_settings' 
      AND constraint_type = 'FOREIGN KEY';
    
    -- Count check constraints for account fields
    SELECT COUNT(*) INTO check_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'accounting_settings' 
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%_account_check';
    
    RAISE NOTICE 'Migration completed:';
    RAISE NOTICE '- Foreign key constraints remaining: %', fk_count;
    RAISE NOTICE '- Check constraints for account fields: %', check_count;
    
    IF fk_count = 0 AND check_count >= 7 THEN
        RAISE NOTICE 'SUCCESS: All foreign key constraints removed and check constraints added';
    ELSE
        RAISE WARNING 'ATTENTION: Migration may be incomplete - please verify manually';
    END IF;
END $$; 