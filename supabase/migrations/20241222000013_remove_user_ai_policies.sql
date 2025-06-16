-- Remove all user-level policies from ai_config table and ensure only admin policies exist

-- Drop ALL existing policies on ai_config table (both user and admin)
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

-- Drop admin policies to recreate them cleanly
DROP POLICY IF EXISTS "Admin can view all AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can insert AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can update AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can delete AI configurations" ON ai_config;

-- Ensure the is_admin function exists and is up to date
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

-- Create ONLY admin policies (no user policies)
CREATE POLICY "Admin can view all AI configurations" ON ai_config
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admin can insert AI configurations" ON ai_config
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin can update AI configurations" ON ai_config
    FOR UPDATE USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin can delete AI configurations" ON ai_config
    FOR DELETE USING (is_admin(auth.uid()));

-- Verify that RLS is enabled
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

-- Add a comment to document the admin-only access
COMMENT ON TABLE ai_config IS 'AI configuration table - ADMIN ACCESS ONLY. Regular users cannot access this table directly. Admins manage AI configurations for all users.'; 