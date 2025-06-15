/*
  # Fix retained_earnings_account constraint violation
  
  This migration fixes the check constraint violation for retained_earnings_account
  by setting any invalid account IDs to NULL.
*/

-- First, let's see what values exist in retained_earnings_account
DO $$
DECLARE
    invalid_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    -- Count total records
    SELECT COUNT(*) INTO total_count FROM accounting_settings;
    
    -- Count records with invalid retained_earnings_account values
    SELECT COUNT(*) INTO invalid_count 
    FROM accounting_settings 
    WHERE retained_earnings_account IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM "userDefinedAccounts" WHERE id = retained_earnings_account
        UNION
        SELECT 1 FROM "systemAccounts" WHERE id = retained_earnings_account
      );
    
    RAISE NOTICE 'Total accounting_settings records: %', total_count;
    RAISE NOTICE 'Records with invalid retained_earnings_account: %', invalid_count;
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Found % invalid retained_earnings_account values that need to be fixed', invalid_count;
    ELSE
        RAISE NOTICE 'No invalid retained_earnings_account values found';
    END IF;
END $$;

-- Fix invalid retained_earnings_account values by setting them to NULL
UPDATE accounting_settings 
SET retained_earnings_account = NULL 
WHERE retained_earnings_account IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM "userDefinedAccounts" WHERE id = retained_earnings_account
    UNION
    SELECT 1 FROM "systemAccounts" WHERE id = retained_earnings_account
  );

-- Also fix any invalid discounts_account values
UPDATE accounting_settings 
SET discounts_account = NULL 
WHERE discounts_account IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM "userDefinedAccounts" WHERE id = discounts_account
    UNION
    SELECT 1 FROM "systemAccounts" WHERE id = discounts_account
  );

-- Verify the fix worked
DO $$
DECLARE
    invalid_retained INTEGER := 0;
    invalid_discounts INTEGER := 0;
BEGIN
    -- Check retained_earnings_account
    SELECT COUNT(*) INTO invalid_retained 
    FROM accounting_settings 
    WHERE retained_earnings_account IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM "userDefinedAccounts" WHERE id = retained_earnings_account
        UNION
        SELECT 1 FROM "systemAccounts" WHERE id = retained_earnings_account
      );
    
    -- Check discounts_account
    SELECT COUNT(*) INTO invalid_discounts 
    FROM accounting_settings 
    WHERE discounts_account IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM "userDefinedAccounts" WHERE id = discounts_account
        UNION
        SELECT 1 FROM "systemAccounts" WHERE id = discounts_account
      );
    
    IF invalid_retained = 0 AND invalid_discounts = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All account references are now valid!';
        RAISE NOTICE 'Chart of Accounts should now save without constraint violations.';
    ELSE
        RAISE WARNING '⚠️  Still have invalid references: retained_earnings: %, discounts: %', invalid_retained, invalid_discounts;
    END IF;
END $$; 