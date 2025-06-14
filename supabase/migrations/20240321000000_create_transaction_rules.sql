-- Create transaction_rules table
CREATE TABLE IF NOT EXISTS transaction_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount_min DECIMAL(12,2),
    amount_max DECIMAL(12,2),
    description_contains TEXT,
    bank_name TEXT,
    action TEXT NOT NULL DEFAULT 'reconcile',
    account_mapping TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create RLS policies
ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transaction rules"
    ON transaction_rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction rules"
    ON transaction_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction rules"
    ON transaction_rules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction rules"
    ON transaction_rules FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transaction_rules_updated_at
    BEFORE UPDATE ON transaction_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 