-- Create plaidAccount table for storing account data with hybrid approach
-- This table will store account metadata and cached balance data

CREATE TABLE IF NOT EXISTS plaidAccount (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connected_bank_id UUID NOT NULL REFERENCES connected_banks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Plaid account identifiers
    plaid_account_id TEXT NOT NULL,
    plaid_item_id TEXT NOT NULL,
    
    -- Account basic information
    name TEXT NOT NULL,
    official_name TEXT,
    type TEXT NOT NULL, -- depository, credit, loan, investment, etc.
    subtype TEXT, -- checking, savings, credit card, etc.
    mask TEXT, -- last 4 digits
    
    -- Balance information (cached from Plaid)
    current_balance DECIMAL(15,2),
    available_balance DECIMAL(15,2),
    credit_limit DECIMAL(15,2),
    currency_code TEXT DEFAULT 'USD',
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    last_balance_update TIMESTAMP WITH TIME ZONE,
    last_plaid_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(plaid_account_id, connected_bank_id),
    
    -- Indexes for performance
    INDEX idx_plaidaccount_user_id (user_id),
    INDEX idx_plaidaccount_connected_bank_id (connected_bank_id),
    INDEX idx_plaidaccount_plaid_account_id (plaid_account_id),
    INDEX idx_plaidaccount_active (is_active),
    INDEX idx_plaidaccount_last_sync (last_plaid_sync)
);

-- Enable Row Level Security
ALTER TABLE plaidAccount ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for plaidAccount table
-- Users can only see their own accounts
CREATE POLICY "Users can view their own plaid accounts" ON plaidAccount
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own accounts (for sync operations)
CREATE POLICY "Users can insert their own plaid accounts" ON plaidAccount
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own accounts (for balance updates)
CREATE POLICY "Users can update their own plaid accounts" ON plaidAccount
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own accounts
CREATE POLICY "Users can delete their own plaid accounts" ON plaidAccount
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_plaidaccount_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plaidaccount_updated_at
    BEFORE UPDATE ON plaidAccount
    FOR EACH ROW
    EXECUTE FUNCTION update_plaidaccount_updated_at();

-- Add RLS policy to connected_banks table if not exists
-- (Ensure users can only see their own connected banks)
DO $$
BEGIN
    -- Check if RLS is enabled on connected_banks
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'connected_banks' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE connected_banks ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Create policies for connected_banks if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'connected_banks' 
        AND policyname = 'Users can view their own connected banks'
    ) THEN
        CREATE POLICY "Users can view their own connected banks" ON connected_banks
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'connected_banks' 
        AND policyname = 'Users can insert their own connected banks'
    ) THEN
        CREATE POLICY "Users can insert their own connected banks" ON connected_banks
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'connected_banks' 
        AND policyname = 'Users can update their own connected banks'
    ) THEN
        CREATE POLICY "Users can update their own connected banks" ON connected_banks
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'connected_banks' 
        AND policyname = 'Users can delete their own connected banks'
    ) THEN
        CREATE POLICY "Users can delete their own connected banks" ON connected_banks
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Create a view for easy account querying with bank information
CREATE OR REPLACE VIEW user_plaid_accounts AS
SELECT 
    pa.id,
    pa.connected_bank_id,
    pa.user_id,
    pa.plaid_account_id,
    pa.name,
    pa.official_name,
    pa.type,
    pa.subtype,
    pa.mask,
    pa.current_balance,
    pa.available_balance,
    pa.credit_limit,
    pa.currency_code,
    pa.is_active,
    pa.last_balance_update,
    pa.last_plaid_sync,
    pa.created_at,
    pa.updated_at,
    cb.institution_name,
    cb.item_id as bank_item_id,
    cb.created_at as bank_connected_at
FROM plaidAccount pa
JOIN connected_banks cb ON pa.connected_bank_id = cb.id
WHERE pa.is_active = true;

-- Enable RLS on the view
ALTER VIEW user_plaid_accounts SET (security_barrier = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON plaidAccount TO authenticated;
GRANT SELECT ON user_plaid_accounts TO authenticated;
GRANT USAGE ON SEQUENCE plaidAccount_id_seq TO authenticated;

-- Create function to sync account data from Plaid
CREATE OR REPLACE FUNCTION sync_plaid_account_data(
    p_connected_bank_id UUID,
    p_user_id UUID,
    p_plaid_account_id TEXT,
    p_plaid_item_id TEXT,
    p_name TEXT,
    p_official_name TEXT DEFAULT NULL,
    p_type TEXT DEFAULT NULL,
    p_subtype TEXT DEFAULT NULL,
    p_mask TEXT DEFAULT NULL,
    p_current_balance DECIMAL DEFAULT NULL,
    p_available_balance DECIMAL DEFAULT NULL,
    p_credit_limit DECIMAL DEFAULT NULL,
    p_currency_code TEXT DEFAULT 'USD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    account_id UUID;
BEGIN
    -- Check if user owns the connected bank
    IF NOT EXISTS (
        SELECT 1 FROM connected_banks 
        WHERE id = p_connected_bank_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Access denied: User does not own this connected bank';
    END IF;
    
    -- Upsert account data
    INSERT INTO plaidAccount (
        connected_bank_id,
        user_id,
        plaid_account_id,
        plaid_item_id,
        name,
        official_name,
        type,
        subtype,
        mask,
        current_balance,
        available_balance,
        credit_limit,
        currency_code,
        last_balance_update,
        last_plaid_sync
    ) VALUES (
        p_connected_bank_id,
        p_user_id,
        p_plaid_account_id,
        p_plaid_item_id,
        p_name,
        p_official_name,
        p_type,
        p_subtype,
        p_mask,
        p_current_balance,
        p_available_balance,
        p_credit_limit,
        p_currency_code,
        NOW(),
        NOW()
    )
    ON CONFLICT (plaid_account_id, connected_bank_id)
    DO UPDATE SET
        name = EXCLUDED.name,
        official_name = EXCLUDED.official_name,
        type = EXCLUDED.type,
        subtype = EXCLUDED.subtype,
        mask = EXCLUDED.mask,
        current_balance = EXCLUDED.current_balance,
        available_balance = EXCLUDED.available_balance,
        credit_limit = EXCLUDED.credit_limit,
        currency_code = EXCLUDED.currency_code,
        last_balance_update = NOW(),
        last_plaid_sync = NOW(),
        updated_at = NOW(),
        is_active = true
    RETURNING id INTO account_id;
    
    RETURN account_id;
END;
$$;

-- Grant execute permission on the sync function
GRANT EXECUTE ON FUNCTION sync_plaid_account_data TO authenticated;

-- Create function to get stale accounts (for background refresh)
CREATE OR REPLACE FUNCTION get_stale_plaid_accounts(
    p_user_id UUID,
    p_stale_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    account_id UUID,
    connected_bank_id UUID,
    plaid_account_id TEXT,
    last_sync TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.id,
        pa.connected_bank_id,
        pa.plaid_account_id,
        pa.last_plaid_sync
    FROM plaidAccount pa
    WHERE pa.user_id = p_user_id
    AND pa.is_active = true
    AND (
        pa.last_plaid_sync IS NULL 
        OR pa.last_plaid_sync < NOW() - INTERVAL '1 minute' * p_stale_minutes
    )
    ORDER BY pa.last_plaid_sync ASC NULLS FIRST;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_stale_plaid_accounts TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE plaidAccount IS 'Stores Plaid account data with cached balances for hybrid approach';
COMMENT ON COLUMN plaidAccount.connected_bank_id IS 'Reference to the connected bank';
COMMENT ON COLUMN plaidAccount.user_id IS 'User who owns this account (for RLS)';
COMMENT ON COLUMN plaidAccount.plaid_account_id IS 'Plaid unique account identifier';
COMMENT ON COLUMN plaidAccount.last_balance_update IS 'When balance data was last updated from Plaid';
COMMENT ON COLUMN plaidAccount.last_plaid_sync IS 'When account was last synced with Plaid API';
COMMENT ON FUNCTION sync_plaid_account_data IS 'Upserts account data from Plaid API calls';
COMMENT ON FUNCTION get_stale_plaid_accounts IS 'Returns accounts that need balance refresh'; 