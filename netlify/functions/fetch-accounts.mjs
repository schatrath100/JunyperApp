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
    console.log('Received request to fetch accounts');
    const body = JSON.parse(event.body || '{}');
    const { userId, bankId } = body;
    
    if (!userId) {
      console.error('Missing userId in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    // Get connected banks from Supabase
    let query = supabase
      .from('connected_banks')
      .select('*')
      .eq('user_id', userId);

    if (bankId) {
      query = query.eq('id', bankId);
    }

    const { data: connectedBanks, error } = await query;

    if (error || !connectedBanks?.length) {
      console.error('No connected banks found for user:', error);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No connected banks found for user' }),
      };
    }

    console.log(`Fetching accounts for ${connectedBanks.length} connected banks`);
    
    const banksWithAccounts = await Promise.all(
      connectedBanks.map(async (bank) => {
        try {
          // Fetch accounts
          const accountsResponse = await plaidClient.accountsGet({
            access_token: bank.access_token,
          });

          // Fetch institution details for logo
          const institutionResponse = await plaidClient.institutionsGetById({
            institution_id: accountsResponse.data.item.institution_id,
            country_codes: ['US'],
            options: {
              include_optional_metadata: true
            }
          });

          console.log(`Institution data for ${bank.institution_name}:`, {
            name: institutionResponse.data.institution.name,
            hasLogo: !!institutionResponse.data.institution.logo,
            primaryColor: institutionResponse.data.institution.primary_color
          });

          // Update last sync time in database
          await supabase
            .from('connected_banks')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', bank.id);

          return {
            ...bank,
            accounts: accountsResponse.data.accounts.map(account => ({
              account_id: account.account_id,
              name: account.name,
              official_name: account.official_name,
              type: account.type,
              subtype: account.subtype,
              mask: account.mask,
              balances: {
                available: account.balances.available,
                current: account.balances.current,
                limit: account.balances.limit,
                iso_currency_code: account.balances.iso_currency_code,
              }
            })),
            institution: {
              name: institutionResponse.data.institution.name,
              logo: institutionResponse.data.institution.logo,
              primary_color: institutionResponse.data.institution.primary_color,
              url: institutionResponse.data.institution.url,
            },
            last_sync: new Date().toISOString()
          };
        } catch (error) {
          console.error(`Error fetching accounts for bank ${bank.id}:`, error);
          return {
            ...bank,
            accounts: [],
            error: error.message,
            last_sync: bank.updated_at
          };
        }
      })
    );

    console.log('Accounts fetched successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ banks: banksWithAccounts }),
    };
  } catch (error) {
    console.error('Error fetching accounts:', error?.response?.data || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch accounts',
        details: error?.response?.data?.error_message || error.message
      }),
    };
  }
}; 