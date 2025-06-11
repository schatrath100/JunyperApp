-- Create connected_banks table
CREATE TABLE IF NOT EXISTS connected_banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, item_id)
);

-- Create RLS policies
ALTER TABLE connected_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connected banks"
    ON connected_banks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected banks"
    ON connected_banks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected banks"
    ON connected_banks FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_connected_banks_updated_at
    BEFORE UPDATE ON connected_banks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 