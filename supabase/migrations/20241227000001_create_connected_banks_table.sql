-- Create connected_banks table for storing Plaid bank connections
CREATE TABLE IF NOT EXISTS connected_banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_connected_banks_user_id ON connected_banks(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_banks_item_id ON connected_banks(item_id);

-- Enable RLS (Row Level Security)
ALTER TABLE connected_banks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own connected banks" ON connected_banks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected banks" ON connected_banks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected banks" ON connected_banks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected banks" ON connected_banks
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_connected_banks_updated_at 
    BEFORE UPDATE ON connected_banks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 