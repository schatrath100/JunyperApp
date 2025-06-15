-- =====================================================
-- REINSTATE RLS POLICIES FOR BANK_TRANSACTIONS TABLE
-- CLEAN VERSION - Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Enable RLS on the table
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can view their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can insert their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can update their own bank transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Users can delete their own bank transactions" ON bank_transactions;

-- Create SELECT policy
CREATE POLICY "Users can view their own bank transactions" ON bank_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create INSERT policy
CREATE POLICY "Users can insert their own bank transactions" ON bank_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy
CREATE POLICY "Users can update their own bank transactions" ON bank_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant table permissions (no DELETE permission)
GRANT SELECT, INSERT, UPDATE ON bank_transactions TO authenticated;

-- Verify policies were created
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'bank_transactions' ORDER BY cmd; 