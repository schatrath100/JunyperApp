/*
  # Update Plaid Functions to Include Transaction Status

  1. Changes
    - Update upsert_plaid_transaction function to include transaction_status
    - Ensure all Plaid transactions get 'New' status by default
*/

-- Update the upsert_plaid_transaction function to include transaction_status
CREATE OR REPLACE FUNCTION upsert_plaid_transaction(
    p_user_id UUID,
    p_plaid_transaction_id TEXT,
    p_plaid_account_id TEXT,
    p_plaid_item_id TEXT,
    p_date DATE,
    p_authorized_date DATE DEFAULT NULL,
    p_description TEXT,
    p_merchant_name TEXT DEFAULT NULL,
    p_original_description TEXT DEFAULT NULL,
    p_amount DECIMAL,
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

    -- Upsert transaction with transaction_status
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
        transaction_status,
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
        'New', -- Default status for new Plaid transactions
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
        -- Note: We don't update transaction_status on conflict to preserve any manual status changes
    RETURNING id INTO transaction_id;

    RETURN transaction_id;
END;
$$; 