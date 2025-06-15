-- =====================================================
-- REMOVE DELETE RLS POLICIES FROM BANK_TRANSACTIONS
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Drop the delete policy for bank_transactions table
-- This will prevent users from deleting records from this table
DROP POLICY IF EXISTS "Users can delete their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "delete_own_bank_transactions" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_delete_policy" ON bank_transactions;

-- List all existing policies to verify (optional verification query)
-- Uncomment the line below to see remaining policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'bank_transactions';

-- Verify RLS is still enabled but delete is not allowed
-- The table should still have SELECT, INSERT, and UPDATE policies but no DELETE policy 