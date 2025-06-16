-- =====================================================
-- VERIFY AND CLEAN AI_CONFIG POLICIES
-- Run this in your Supabase SQL Editor to check and clean policies
-- =====================================================

-- 1. Check current policies on ai_config table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ai_config'
ORDER BY cmd, policyname;

-- 2. Check if RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'ai_config';

-- 3. CLEANUP SCRIPT - Remove ALL user policies and keep only admin policies
-- =====================================================

-- Drop ALL possible user-level policy variations
DROP POLICY IF EXISTS "Users can view their own AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can insert their own AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can update their own AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can delete their own AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can view own AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can insert own AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can update own AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can delete own AI config" ON ai_config;
DROP POLICY IF EXISTS "Enable users to view their own AI config" ON ai_config;
DROP POLICY IF EXISTS "Enable users to insert their own AI config" ON ai_config;
DROP POLICY IF EXISTS "Enable users to update their own AI config" ON ai_config;
DROP POLICY IF EXISTS "Enable users to delete their own AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can view their AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can insert their AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can update their AI config" ON ai_config;
DROP POLICY IF EXISTS "Users can delete their AI config" ON ai_config;

-- Ensure admin function exists
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate admin policies to ensure they're correct
DROP POLICY IF EXISTS "Admin can view all AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can insert AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can update AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can delete AI configurations" ON ai_config;

-- Create ONLY admin policies
CREATE POLICY "Admin can view all AI configurations" ON ai_config
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admin can insert AI configurations" ON ai_config
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin can update AI configurations" ON ai_config
    FOR UPDATE USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin can delete AI configurations" ON ai_config
    FOR DELETE USING (is_admin(auth.uid()));

-- Ensure RLS is enabled
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

-- 4. VERIFICATION - Check policies after cleanup
-- =====================================================

SELECT 
    'AFTER CLEANUP:' as status,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ai_config'
ORDER BY cmd, policyname;

-- 5. Test admin function (replace with actual admin user ID)
-- =====================================================
-- SELECT is_admin('your-admin-user-id-here'::UUID) as is_admin_test;

-- 6. Expected result: Should only show 4 admin policies
-- =====================================================
/*
Expected policies after cleanup:
1. "Admin can view all AI configurations" - SELECT
2. "Admin can insert AI configurations" - INSERT  
3. "Admin can update AI configurations" - UPDATE
4. "Admin can delete AI configurations" - DELETE

NO user-level policies should exist.
*/ 