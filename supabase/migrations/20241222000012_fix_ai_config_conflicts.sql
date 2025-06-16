-- Fix AI configuration conflicts by properly handling existing triggers and policies

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_ai_config_updated_at_trigger ON ai_config;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can view all AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can insert AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can update AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can delete AI configurations" ON ai_config;

-- Ensure the function exists
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

-- Recreate RLS Policies for ai_config table (Admin only access)
CREATE POLICY "Admin can view all AI configurations" ON ai_config
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admin can insert AI configurations" ON ai_config
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin can update AI configurations" ON ai_config
    FOR UPDATE USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin can delete AI configurations" ON ai_config
    FOR DELETE USING (is_admin(auth.uid()));

-- Ensure the updated_at function exists
CREATE OR REPLACE FUNCTION update_ai_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_ai_config_updated_at_trigger
    BEFORE UPDATE ON ai_config
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_config_updated_at(); 