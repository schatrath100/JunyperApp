-- =====================================================
-- ENHANCE BANK_TRANSACTIONS TABLE FOR PLAID INTEGRATION
-- FIXED VERSION - Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Add new columns to bank_transactions table for Plaid data
ALTER TABLE bank_transactions 
ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS plaid_account_id TEXT,
ADD COLUMN IF NOT EXISTS plaid_item_id TEXT,
ADD COLUMN IF NOT EXISTS merchant_name TEXT,
ADD COLUMN IF NOT EXISTS original_description TEXT,
ADD COLUMN IF NOT EXISTS category_primary TEXT,
ADD COLUMN IF NOT EXISTS category_detailed TEXT,
ADD COLUMN IF NOT EXISTS payment_channel TEXT,
ADD COLUMN IF NOT EXISTS iso_currency_code TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS authorized_date DATE,
ADD COLUMN IF NOT EXISTS posted_date DATE,
ADD COLUMN IF NOT EXISTS pending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pending_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_region TEXT,
ADD COLUMN IF NOT EXISTS location_postal_code TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS transaction_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS last_plaid_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plaid_data_source TEXT;

-- Add check constraint for transaction_source
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'bank_transactions_transaction_source_check'
    ) THEN
        ALTER TABLE bank_transactions 
        ADD CONSTRAINT bank_transactions_transaction_source_check 
        CHECK (transaction_source IN ('plaid_fetch', 'upload', 'manual'));
    END IF;
END $$;

-- Create partial unique index for Plaid transactions to prevent duplicates
-- This is the correct way to handle unique constraints with WHERE clauses in PostgreSQL
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_plaid_transaction 
ON bank_transactions(plaid_transaction_id) 
WHERE plaid_transaction_id IS NOT NULL;

-- Create other performance indexes
CREATE INDEX IF NOT EXISTS idx_bank_transactions_plaid_transaction_id 
ON bank_transactions(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_plaid_account_id 
ON bank_transactions(plaid_account_id) WHERE plaid_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_source 
ON bank_transactions(transaction_source);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_pending 
ON bank_transactions(pending) WHERE pending = true;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_merchant_name 
ON bank_transactions(merchant_name) WHERE merchant_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_category_primary 
ON bank_transactions(category_primary) WHERE category_primary IS NOT NULL;

-- Update existing transactions to have proper source
UPDATE bank_transactions 
SET transaction_source = 'manual' 
WHERE transaction_source IS NULL;

-- Make transaction_source NOT NULL after setting defaults
ALTER TABLE bank_transactions 
ALTER COLUMN transaction_source SET NOT NULL;

-- =====================================================
-- HELPER FUNCTIONS FOR TRANSACTION MANAGEMENT
-- =====================================================

-- Function to upsert transactions from Plaid
CREATE OR REPLACE FUNCTION upsert_plaid_transaction(
    p_user_id UUID,
    p_plaid_transaction_id TEXT,
    p_plaid_account_id TEXT,
    p_plaid_item_id TEXT,
    p_date DATE,
    p_description TEXT,
    p_amount DECIMAL,
    p_authorized_date DATE DEFAULT NULL,
    p_merchant_name TEXT DEFAULT NULL,
    p_original_description TEXT DEFAULT NULL,
    p_category_primary TEXT DEFAULT NULL,
    p_category_detailed TEXT DEFAULT NULL,
    p_payment_channel TEXT DEFAULT NULL,
    p_pending BOOLEAN DEFAULT FALSE,
    p_pending_transaction_id TEXT DEFAULT NULL,
    p_iso_currency_code TEXT DEFAULT 'USD',
    p_location_address TEXT DEFAULT NULL,
    p_location_city TEXT DEFAULT NULL,
    p_location_region TEXT DEFAULT NULL,
    p_location_postal_code TEXT DEFAULT NULL,
    p_location_country TEXT DEFAULT NULL,
    p_bank_name TEXT DEFAULT NULL,
    p_account_number TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    transaction_id UUID;
    deposit_amount DECIMAL := 0;
    withdrawal_amount DECIMAL := 0;
BEGIN
    -- Convert Plaid amount to deposit/withdrawal
    -- Plaid: positive = money out (withdrawal), negative = money in (deposit)
    IF p_amount > 0 THEN
        withdrawal_amount := p_amount;
    ELSE
        deposit_amount := ABS(p_amount);
    END IF;

    -- Upsert transaction using the unique index on plaid_transaction_id
    INSERT INTO bank_transactions (
        user_id,
        plaid_transaction_id,
        plaid_account_id,
        plaid_item_id,
        date,
        authorized_date,
        posted_date,
        description,
        merchant_name,
        original_description,
        deposit,
        withdrawal,
        category_primary,
        category_detailed,
        payment_channel,
        pending,
        pending_transaction_id,
        iso_currency_code,
        location_address,
        location_city,
        location_region,
        location_postal_code,
        location_country,
        transaction_source,
        last_plaid_sync,
        plaid_data_source,
        bank_name,
        account_number,
        created_at
    ) VALUES (
        p_user_id,
        p_plaid_transaction_id,
        p_plaid_account_id,
        p_plaid_item_id,
        p_date,
        p_authorized_date,
        p_date, -- posted_date same as date for now
        p_description,
        p_merchant_name,
        p_original_description,
        deposit_amount,
        withdrawal_amount,
        p_category_primary,
        p_category_detailed,
        p_payment_channel,
        p_pending,
        p_pending_transaction_id,
        p_iso_currency_code,
        p_location_address,
        p_location_city,
        p_location_region,
        p_location_postal_code,
        p_location_country,
        'plaid_fetch',
        NOW(),
        'plaid_fresh',
        COALESCE(p_bank_name, 'Plaid Bank'),
        COALESCE(p_account_number, 'Unknown'),
        NOW()
    )
    ON CONFLICT (plaid_transaction_id) 
    DO UPDATE SET
        description = EXCLUDED.description,
        merchant_name = EXCLUDED.merchant_name,
        original_description = EXCLUDED.original_description,
        deposit = EXCLUDED.deposit,
        withdrawal = EXCLUDED.withdrawal,
        category_primary = EXCLUDED.category_primary,
        category_detailed = EXCLUDED.category_detailed,
        payment_channel = EXCLUDED.payment_channel,
        pending = EXCLUDED.pending,
        pending_transaction_id = EXCLUDED.pending_transaction_id,
        location_address = EXCLUDED.location_address,
        location_city = EXCLUDED.location_city,
        location_region = EXCLUDED.location_region,
        location_postal_code = EXCLUDED.location_postal_code,
        location_country = EXCLUDED.location_country,
        last_plaid_sync = NOW(),
        plaid_data_source = 'plaid_fresh'
    RETURNING id INTO transaction_id;

    RETURN transaction_id;
END;
$$;

-- Function to get transaction statistics by source
CREATE OR REPLACE FUNCTION get_transaction_stats_by_source(p_user_id UUID)
RETURNS TABLE(
    transaction_source TEXT,
    count BIGINT,
    total_deposits DECIMAL,
    total_withdrawals DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.transaction_source,
        COUNT(*) as count,
        COALESCE(SUM(bt.deposit), 0) as total_deposits,
        COALESCE(SUM(bt.withdrawal), 0) as total_withdrawals
    FROM bank_transactions bt
    WHERE bt.user_id = p_user_id 
      AND bt.deleted = false
    GROUP BY bt.transaction_source
    ORDER BY bt.transaction_source;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_plaid_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_stats_by_source TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN bank_transactions.plaid_transaction_id IS 'Unique identifier from Plaid for this transaction';
COMMENT ON COLUMN bank_transactions.plaid_account_id IS 'Plaid account identifier, links to plaidAccount table';
COMMENT ON COLUMN bank_transactions.merchant_name IS 'Cleaned merchant name from Plaid enrichment';
COMMENT ON COLUMN bank_transactions.category_primary IS 'Primary category from Plaid (e.g., FOOD_AND_DRINK)';
COMMENT ON COLUMN bank_transactions.category_detailed IS 'Detailed category from Plaid (e.g., FOOD_AND_DRINK_RESTAURANTS)';
COMMENT ON COLUMN bank_transactions.transaction_source IS 'How transaction was added: plaid_fetch, upload, or manual';
COMMENT ON COLUMN bank_transactions.pending IS 'Whether transaction is pending or posted';
COMMENT ON COLUMN bank_transactions.payment_channel IS 'Channel used: online, in store, or other';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bank_transactions' 
  AND column_name IN (
    'plaid_transaction_id', 'plaid_account_id', 'merchant_name', 
    'category_primary', 'transaction_source', 'pending'
  )
ORDER BY column_name;

-- Verify constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'bank_transactions' 
  AND constraint_name LIKE '%transaction%';

-- Verify indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'bank_transactions' 
  AND (indexname LIKE '%plaid%' OR indexname LIKE '%source%'); 