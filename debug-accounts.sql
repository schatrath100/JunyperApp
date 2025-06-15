-- Debug and fix retained_earnings_account constraint violation
-- Run this in your Supabase SQL Editor to identify and fix the issue

-- 1. Check current accounting_settings values
SELECT 
    id,
    user_id,
    retained_earnings_account,
    sales_revenue_account,
    purchases_account,
    accounts_receivable_account,
    accounts_payable_account,
    taxes_payable_account,
    cash_account
FROM accounting_settings;

-- 2. Check which account IDs exist in userDefinedAccounts
SELECT 'userDefinedAccounts' as table_name, id, account_name, account_type 
FROM "userDefinedAccounts" 
ORDER BY id;

-- 3. Check which account IDs exist in systemAccounts  
SELECT 'systemAccounts' as table_name, id, account_name, account_type 
FROM "systemAccounts" 
ORDER BY id;

-- 4. Find invalid retained_earnings_account references
SELECT 
    'Invalid retained_earnings_account' as issue,
    id as settings_id,
    retained_earnings_account as invalid_account_id
FROM accounting_settings 
WHERE retained_earnings_account IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM "userDefinedAccounts" WHERE id = retained_earnings_account
    UNION
    SELECT 1 FROM "systemAccounts" WHERE id = retained_earnings_account
  );

-- 5. FIX: Set invalid retained_earnings_account to NULL
UPDATE accounting_settings 
SET retained_earnings_account = NULL 
WHERE retained_earnings_account IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM "userDefinedAccounts" WHERE id = retained_earnings_account
    UNION
    SELECT 1 FROM "systemAccounts" WHERE id = retained_earnings_account
  );

-- 6. Verify the fix
SELECT 
    'After fix' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN retained_earnings_account IS NOT NULL THEN 1 END) as non_null_retained_earnings
FROM accounting_settings; 