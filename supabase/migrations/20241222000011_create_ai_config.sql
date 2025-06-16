-- Create AI configuration table
CREATE TABLE IF NOT EXISTS ai_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    model_provider TEXT NOT NULL CHECK (model_provider IN ('openai', 'anthropic')),
    model_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_tokens INTEGER DEFAULT 1000,
    temperature DECIMAL(3,2) DEFAULT 0.70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_config_user_id ON ai_config(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_config_active ON ai_config(is_active);

-- Enable RLS
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can view all AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can insert AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can update AI configurations" ON ai_config;
DROP POLICY IF EXISTS "Admin can delete AI configurations" ON ai_config;

-- RLS Policies for ai_config table (Admin only access)
CREATE POLICY "Admin can view all AI configurations" ON ai_config
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admin can insert AI configurations" ON ai_config
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin can update AI configurations" ON ai_config
    FOR UPDATE USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin can delete AI configurations" ON ai_config
    FOR DELETE USING (is_admin(auth.uid()));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_ai_config_updated_at_trigger ON ai_config;
CREATE TRIGGER update_ai_config_updated_at_trigger
    BEFORE UPDATE ON ai_config
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_config_updated_at();

-- Add sample configuration for development (remove in production)
-- This is just for testing - you should add real API keys through the UI
INSERT INTO ai_config (user_id, api_key, model_provider, model_name) VALUES
    (
        (SELECT id FROM auth.users LIMIT 1), 
        'your-api-key-here', 
        'openai', 
        'gpt-4o-mini'
    )
ON CONFLICT (user_id) DO NOTHING; 