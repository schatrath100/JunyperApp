-- =====================================================
-- REMOVE RLS POLICIES FROM BANK_TRANSACTIONS TABLE
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Disable RLS on bank_transactions table
ALTER TABLE bank_transactions DISABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can insert their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can update their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can delete their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_select_policy" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_insert_policy" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_update_policy" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_delete_policy" ON bank_transactions;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'bank_transactions';

-- Show any remaining policies (should be empty)
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'bank_transactions'; 