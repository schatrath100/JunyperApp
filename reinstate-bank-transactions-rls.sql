-- =====================================================
-- REINSTATE RLS POLICIES FOR BANK_TRANSACTIONS TABLE
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- First, ensure RLS is enabled on the table
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP ANY EXISTING POLICIES FIRST (to avoid conflicts)
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "select_own_bank_transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can insert their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "insert_own_bank_transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can update their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "update_own_bank_transactions" ON bank_transactions;

-- =====================================================
-- SELECT POLICY - Users can view their own transactions
-- =====================================================
CREATE POLICY "Users can view their own bank transactions" ON bank_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- =====================================================
-- INSERT POLICY - Users can insert their own transactions
-- =====================================================
CREATE POLICY "Users can insert their own bank transactions" ON bank_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- UPDATE POLICY - Users can update their own transactions
-- =====================================================
CREATE POLICY "Users can update their own bank transactions" ON bank_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- EXPLICITLY NO DELETE POLICY
-- This ensures users cannot delete bank transaction records
-- =====================================================

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'bank_transactions';

-- List all policies on the table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'bank_transactions'
ORDER BY cmd, policyname;

-- Test queries (uncomment to test - replace 'your-user-id' with actual UUID)
-- SELECT COUNT(*) FROM bank_transactions WHERE user_id = 'your-user-id'; -- Should work
-- INSERT INTO bank_transactions (user_id, date, description, bank_name, deposit, withdrawal, account_number) 
--   VALUES ('your-user-id', CURRENT_DATE, 'Test', 'Test Bank', 0, 100, 12345); -- Should work
-- UPDATE bank_transactions SET description = 'Updated' WHERE user_id = 'your-user-id' LIMIT 1; -- Should work
-- DELETE FROM bank_transactions WHERE user_id = 'your-user-id' LIMIT 1; -- Should fail

-- =====================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================

-- Ensure authenticated users have the necessary table permissions
GRANT SELECT, INSERT, UPDATE ON bank_transactions TO authenticated;
-- Note: No DELETE permission granted

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE bank_transactions IS 'Bank transactions table with RLS policies for SELECT, INSERT, UPDATE only. DELETE operations are not permitted.';

-- =====================================================
-- SUMMARY OF POLICIES CREATED
-- =====================================================

/*
POLICIES CREATED:
1. SELECT: Users can view their own bank transactions
2. INSERT: Users can insert their own bank transactions  
3. UPDATE: Users can update their own bank transactions
4. DELETE: NO POLICY (users cannot delete transactions)

SECURITY MODEL:
- Row Level Security (RLS) is enabled
- Users can only access transactions where user_id matches auth.uid()
- All operations require authentication
- DELETE operations are completely blocked
- Data integrity is maintained through user isolation
*/ 