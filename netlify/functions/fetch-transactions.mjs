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

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const handler = async (event, context) => {
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

    // 1. Get account details from plaidAccount table
    const { data: accountData, error: accountError } = await supabase
      .from('plaidAccount')
      .select('*, connected_banks!inner(*)')
      .eq('plaid_account_id', plaid_account_id)
      .eq('user_id', user_id)
      .single();

    if (accountError || !accountData) {
      console.error('Account not found:', accountError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Account not found' }),
      };
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

    // 3. Fetch transactions from Plaid
    console.log('Calling Plaid transactions/sync API');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days_to_fetch);
    
    const endDate = new Date();
    
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

    const response = await plaidClient.transactionsGet(request);
    const transactions = response.data.transactions;

    console.log(`Found ${transactions.length} transactions from Plaid`);

    // 4. Transform and store transactions
    const storedTransactions = [];
    let successCount = 0;
    let errorCount = 0;

    for (const tx of transactions) {
      try {
        // Call the upsert function
        const { data, error } = await supabase.rpc('upsert_plaid_transaction', {
          p_user_id: user_id,
          p_plaid_transaction_id: tx.transaction_id,
          p_plaid_account_id: plaid_account_id,
          p_plaid_item_id: accountData.plaid_item_id,
          p_date: tx.date,
          p_authorized_date: tx.authorized_date,
          p_description: tx.name,
          p_merchant_name: tx.merchant_name,
          p_original_description: tx.original_description,
          p_amount: tx.amount,
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
          p_account_number: accountData.mask || 'Unknown'
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

    // 5. Update account sync timestamp
    await supabase
      .from('plaidAccount')
      .update({ 
        last_plaid_sync: new Date().toISOString(),
        last_balance_update: new Date().toISOString()
      })
      .eq('plaid_account_id', plaid_account_id)
      .eq('user_id', user_id);

    console.log(`Transaction fetch completed. Success: ${successCount}, Errors: ${errorCount}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully fetched ${successCount} transactions`,
        transactions_count: successCount,
        errors_count: errorCount,
        account_name: accountData.name,
        institution_name: institution_name,
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        transactions: storedTransactions.slice(0, 10) // Return first 10 for preview
      }),
    };

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch transactions',
        details: error.message
      }),
    };
  }
}; 