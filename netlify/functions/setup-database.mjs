import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    console.log('Checking if plaidAccount table exists...');
    
    // Check if plaidAccount table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'plaidAccount');

    if (tableError) {
      console.error('Error checking tables:', tableError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to check database tables' }),
      };
    }

    const tableExists = tables && tables.length > 0;
    console.log('plaidAccount table exists:', tableExists);

    if (!tableExists) {
      console.log('Creating plaidAccount table...');
      
      // Create the table using raw SQL
      const createTableSQL = `
        -- Create plaidAccount table
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
            type TEXT NOT NULL,
            subtype TEXT,
            mask TEXT,
            
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
            UNIQUE(plaid_account_id, connected_bank_id)
        );

        -- Enable Row Level Security
        ALTER TABLE plaidAccount ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Users can view their own plaid accounts" ON plaidAccount
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own plaid accounts" ON plaidAccount
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own plaid accounts" ON plaidAccount
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own plaid accounts" ON plaidAccount
            FOR DELETE USING (auth.uid() = user_id);

        -- Create sync function
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

        -- Grant permissions
        GRANT SELECT, INSERT, UPDATE, DELETE ON plaidAccount TO authenticated;
        GRANT EXECUTE ON FUNCTION sync_plaid_account_data TO authenticated;
      `;

      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('Error creating table:', createError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to create plaidAccount table', details: createError }),
        };
      }

      console.log('plaidAccount table created successfully');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        tableExists: tableExists,
        message: tableExists ? 'Table already exists' : 'Table created successfully'
      }),
    };
  } catch (error) {
    console.error('Error in setup-database:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Database setup failed',
        details: error.message
      }),
    };
  }
}; 