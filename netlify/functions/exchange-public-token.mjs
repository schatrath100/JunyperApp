import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
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

// Helper function to exchange public token for access token
const exchangePublicToken = async (publicToken) => {
  try {
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      throw new Error('Missing Plaid credentials. Please check your environment variables.');
    }

    console.log('Exchanging public token for access token');
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    console.log('Public token exchanged successfully');
    return response.data;
  } catch (error) {
    console.error('Error exchanging public token:', error?.response?.data || error);
    throw new Error(error?.response?.data?.error_message || error.message || 'Failed to exchange public token');
  }
};

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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('Received request to exchange public token');
    const body = JSON.parse(event.body || '{}');
    const { public_token, userId, institutionName } = body;
    
    if (!public_token || !userId || !institutionName) {
      console.error('Missing required fields in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'public_token, userId, and institutionName are required' }),
      };
    }

    console.log('Exchanging public token for access token');
    const response = await exchangePublicToken(public_token);
    
    console.log('Storing access token and institution name in Supabase');
    const { data: bankData, error } = await supabase
      .from('connected_banks')
      .upsert({
        user_id: userId,
        item_id: response.item_id,
        access_token: response.access_token,
        institution_name: institutionName,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing connected bank:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to store connected bank details' }),
      };
    }

    console.log('Bank details stored successfully, now fetching and storing accounts...');

    // Fetch and store account details immediately after connecting bank
    try {
      const accountsResponse = await plaidClient.accountsGet({
        access_token: response.access_token,
      });

      console.log(`Found ${accountsResponse.data.accounts.length} accounts for new bank`);

      // Store each account in the plaidAccount table
      for (const account of accountsResponse.data.accounts) {
        const { error: accountError } = await supabase.rpc('sync_plaid_account_data', {
          p_connected_bank_id: bankData.id,
          p_user_id: userId,
          p_plaid_account_id: account.account_id,
          p_plaid_item_id: response.item_id,
          p_name: account.name,
          p_official_name: account.official_name,
          p_type: account.type,
          p_subtype: account.subtype,
          p_mask: account.mask,
          p_current_balance: account.balances.current,
          p_available_balance: account.balances.available,
          p_credit_limit: account.balances.limit,
          p_currency_code: account.balances.iso_currency_code || 'USD'
        });

        if (accountError) {
          console.error(`Error storing account ${account.account_id}:`, accountError);
        } else {
          console.log(`Successfully stored account: ${account.name} (${account.account_id})`);
        }
      }

      console.log('All accounts stored successfully in database');
    } catch (accountError) {
      console.error('Error fetching/storing accounts during bank connection:', accountError);
      // Don't throw here - bank connection was successful, account sync can be retried
    }

    console.log('Public token exchanged and bank details stored successfully');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, item_id: response.item_id, access_token: response.access_token }),
    };
  } catch (error) {
    console.error('Error exchanging public token:', error?.response?.data || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to exchange public token',
        details: error?.response?.data?.error_message || error.message
      }),
    };
  }
}; 