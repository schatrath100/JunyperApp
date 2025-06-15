import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@supabase/supabase-js';

// Initialize Plaid client
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

export const handler = async (event, context) => {
  // Initialize Supabase client with service role key to bypass RLS for backend operations
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Received request to fetch transactions');
    console.log('Environment check:', {
      hasPlaidClientId: !!process.env.PLAID_CLIENT_ID,
      hasPlaidSecret: !!process.env.PLAID_SECRET,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    
    const body = JSON.parse(event.body || '{}');
    const { plaid_account_id, user_id, force_refresh = false, days_to_fetch = 30 } = body;
    
    if (!plaid_account_id || !user_id) {
      console.error('Missing required parameters');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'plaid_account_id and user_id are required' }),
      };
    }

    console.log('Fetching transactions for account:', plaid_account_id, 'user:', user_id);
    console.log('Request parameters:', { plaid_account_id, user_id, force_refresh, days_to_fetch });

    // 1. Get account details from plaidAccount table
    console.log('Querying plaidAccount table for:', { plaid_account_id, user_id });
    
    // First, let's see what accounts exist for this user
    const { data: allUserAccounts, error: allAccountsError } = await supabase
      .from('plaidAccount')
      .select('plaid_account_id, name, user_id, connected_bank_id')
      .eq('user_id', user_id);
    
    console.log('All accounts for user:', allUserAccounts);
    console.log('Looking for account:', plaid_account_id);
    
    // Now try to find the specific account
    const { data: accountCheck, error: checkError } = await supabase
      .from('plaidAccount')
      .select('*')
      .eq('plaid_account_id', plaid_account_id)
      .eq('user_id', user_id);
    
    console.log('Account check result:', { accountCheck, checkError, count: accountCheck?.length });
    
    // Now get the full account data with connected bank info
    let { data: accountData, error: accountError } = await supabase
      .from('plaidAccount')
      .select('*, connected_banks!inner(*)')
      .eq('plaid_account_id', plaid_account_id)
      .eq('user_id', user_id)
      .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

    if (accountError || !accountData) {
      console.error('Account not found:', accountError);
      console.error('Query parameters:', { plaid_account_id, user_id });
      console.error('Account check showed:', accountCheck?.length || 0, 'accounts');
      
      // If account exists but join failed, try a different approach
      if (accountCheck && accountCheck.length > 0) {
        console.log('Account exists but join failed, trying separate queries...');
        const account = accountCheck[0];
        const { data: bankData, error: bankError } = await supabase
          .from('connected_banks')
          .select('*')
          .eq('id', account.connected_bank_id)
          .single();
        
        if (bankData && !bankError) {
          console.log('Successfully retrieved bank data separately');
          // Manually combine the data
          const combinedData = {
            ...account,
            connected_banks: bankData
          };
          // Continue with this data
          accountData = combinedData;
        } else {
          console.error('Failed to get bank data:', bankError);
        }
      }
      
      if (!accountData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            error: 'Account not found',
            details: accountError?.message || 'No account data returned',
            query_params: { plaid_account_id, user_id },
            debug_info: {
              account_exists: accountCheck?.length > 0,
              account_error: checkError?.message,
              join_error: accountError?.message
            }
          }),
        };
      }
    }

    console.log('Found account:', accountData.name);

    // 2. Get access token from connected_banks
    const access_token = accountData.connected_banks.access_token;
    const institution_name = accountData.connected_banks.institution_name;

    if (!access_token) {
      console.error('No access token found');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No access token found for this account' }),
      };
    }

    // 3. Determine fetch strategy - incremental vs full
    let startDate, endDate, fetchStrategy;
    
    // Check when transactions were last fetched for this account
    const { data: lastTransaction, error: lastTransactionError } = await supabase
      .from('bank_transactions')
      .select('date, created_at')
      .eq('plaid_account_id', plaid_account_id)
      .eq('user_id', user_id)
      .eq('transaction_source', 'plaid_fetch')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

    console.log('Last transaction query result:', { lastTransaction, lastTransactionError, last_plaid_sync: accountData.last_plaid_sync });

    if (lastTransactionError) {
      console.error('Error querying last transaction:', lastTransactionError);
      // Continue with full fetch if query fails
    }

    if (!force_refresh && lastTransaction && accountData.last_plaid_sync && !lastTransactionError) {
      // Incremental fetch: Get transactions since last sync
      const lastSyncDate = new Date(accountData.last_plaid_sync);
      const daysSinceLastSync = Math.ceil((new Date() - lastSyncDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastSync <= 30) {
        // Incremental fetch - only get new transactions
        startDate = new Date(lastSyncDate);
        startDate.setDate(startDate.getDate() - 1); // Go back 1 day to catch any missed transactions
        endDate = new Date();
        fetchStrategy = 'incremental';
        console.log(`Incremental fetch: Getting transactions since ${startDate.toISOString().split('T')[0]}`);
      } else {
        // Full fetch if it's been too long
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days_to_fetch);
        endDate = new Date();
        fetchStrategy = 'full_stale';
        console.log(`Full fetch (stale): Getting last ${days_to_fetch} days of transactions`);
      }
    } else {
      // Full fetch for first time or forced refresh
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days_to_fetch);
      endDate = new Date();
      fetchStrategy = force_refresh ? 'full_forced' : 'full_initial';
      console.log(`Full fetch (${fetchStrategy}): Getting last ${days_to_fetch} days of transactions`);
    }
    
    // 4. Fetch transactions from Plaid
    console.log('Calling Plaid transactions API with strategy:', fetchStrategy);
    const request = {
      access_token: access_token,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      options: {
        account_ids: [plaid_account_id],
        count: 500,
        offset: 0
      }
    };

    console.log('Plaid API request:', request);

    let response, transactions;
    try {
      response = await plaidClient.transactionsGet(request);
      transactions = response.data.transactions;
      console.log('Plaid API response received successfully');
    } catch (plaidError) {
      console.error('Plaid API error:', plaidError);
      throw new Error(`Plaid API error: ${plaidError.message}`);
    }

    console.log(`Found ${transactions.length} transactions from Plaid using ${fetchStrategy} strategy`);

    // 5. Transform and store transactions
    const storedTransactions = [];
    let successCount = 0;
    let errorCount = 0;

    for (const tx of transactions) {
      try {
        // Call the upsert function with required parameters first, then optional ones
        const { data, error } = await supabase.rpc('upsert_plaid_transaction', {
          // Required parameters (no defaults)
          p_user_id: user_id,
          p_plaid_transaction_id: tx.transaction_id,
          p_plaid_account_id: plaid_account_id,
          p_plaid_item_id: accountData.plaid_item_id,
          p_date: tx.date,
          p_description: tx.name,
          p_amount: tx.amount,
          // Optional parameters (with defaults)
          p_authorized_date: tx.authorized_date,
          p_merchant_name: tx.merchant_name,
          p_original_description: tx.original_description,
          p_category_primary: tx.personal_finance_category?.primary,
          p_category_detailed: tx.personal_finance_category?.detailed,
          p_payment_channel: tx.payment_channel,
          p_pending: tx.pending,
          p_pending_transaction_id: tx.pending_transaction_id,
          p_iso_currency_code: tx.iso_currency_code || 'USD',
          p_location_address: tx.location?.address,
          p_location_city: tx.location?.city,
          p_location_region: tx.location?.region,
          p_location_postal_code: tx.location?.postal_code,
          p_location_country: tx.location?.country,
          p_bank_name: institution_name,
          p_account_number: accountData.mask || null
        });

        if (error) {
          console.error('Error storing transaction:', tx.transaction_id, error);
          errorCount++;
        } else {
          storedTransactions.push({
            id: data,
            plaid_transaction_id: tx.transaction_id,
            description: tx.name,
            amount: tx.amount,
            date: tx.date
          });
          successCount++;
        }
      } catch (err) {
        console.error('Exception storing transaction:', tx.transaction_id, err);
        errorCount++;
      }
    }

    // 6. Update account sync timestamp
    await supabase
      .from('plaidAccount')
      .update({ 
        last_plaid_sync: new Date().toISOString(),
        last_balance_update: new Date().toISOString()
      })
      .eq('plaid_account_id', plaid_account_id)
      .eq('user_id', user_id);

    console.log(`Transaction fetch completed. Success: ${successCount}, Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.error(`Failed to store ${errorCount} transactions. Check database schema for account_number column.`);
    }

    const responseMessage = successCount > 0 
      ? `Successfully stored ${successCount} transactions using ${fetchStrategy} strategy`
      : `Found ${transactions.length} transactions but failed to store them due to database errors.`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: successCount > 0,
        message: responseMessage,
        transactions_count: successCount,
        errors_count: errorCount,
        account_name: accountData.name,
        institution_name: institution_name,
        fetch_strategy: fetchStrategy,
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        transactions: storedTransactions.slice(0, 10), // Return first 10 for preview
        error_details: errorCount > 0 ? 'Database schema mismatch - account_number column type issue' : null
      }),
    };

  } catch (error) {
    console.error('Error fetching transactions:', error);
    console.error('Error stack:', error.stack);
    
    // Ensure we always return valid JSON
    const errorResponse = {
      error: 'Failed to fetch transactions',
      details: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(errorResponse),
    };
  }
}; 