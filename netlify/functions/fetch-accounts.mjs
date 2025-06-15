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

    console.log(`Fetching accounts for ${connectedBanks.length} connected banks using hybrid approach`);
    
    const banksWithAccounts = await Promise.all(
      connectedBanks.map(async (bank) => {
        try {
          // First, try to get accounts from database
          const { data: cachedAccounts, error: dbError } = await supabase
            .from('plaidAccount')
            .select('*')
            .eq('connected_bank_id', bank.id)
            .eq('is_active', true);

          if (dbError) {
            console.error(`Database error for bank ${bank.id}:`, dbError);
          }

          let shouldRefreshFromPlaid = false;
          let accounts = [];

          // Check if we need to refresh from Plaid
          if (!cachedAccounts || cachedAccounts.length === 0) {
            console.log(`No cached accounts found for bank ${bank.institution_name}, fetching from Plaid`);
            shouldRefreshFromPlaid = true;
          } else {
            // Check if data is stale (older than 1 hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const hasStaleData = cachedAccounts.some(account => 
              !account.last_plaid_sync || new Date(account.last_plaid_sync) < oneHourAgo
            );

            if (hasStaleData || bankId === bank.id) {
              console.log(`Refreshing stale data for bank ${bank.institution_name} from Plaid`);
              shouldRefreshFromPlaid = true;
            } else {
              console.log(`Using cached data for bank ${bank.institution_name}`);
              accounts = cachedAccounts.map(account => ({
                account_id: account.plaid_account_id,
                name: account.name,
                official_name: account.official_name,
                type: account.type,
                subtype: account.subtype,
                mask: account.mask,
                balances: {
                  available: account.available_balance,
                  current: account.current_balance,
                  limit: account.credit_limit,
                  iso_currency_code: account.currency_code,
                },
                last_plaid_sync: account.last_plaid_sync
              }));
            }
          }

          let institution = null;

          // Refresh from Plaid if needed
          if (shouldRefreshFromPlaid) {
            try {
              // Fetch fresh accounts from Plaid
              const accountsResponse = await plaidClient.accountsGet({
                access_token: bank.access_token,
              });

              console.log(`Fetched ${accountsResponse.data.accounts.length} accounts from Plaid for ${bank.institution_name}`);

              // Update database with fresh data
              for (const account of accountsResponse.data.accounts) {
                console.log(`Syncing account ${account.account_id} to database...`);
                const { data: syncResult, error: syncError } = await supabase.rpc('sync_plaid_account_data', {
                  p_connected_bank_id: bank.id,
                  p_user_id: userId,
                  p_plaid_account_id: account.account_id,
                  p_plaid_item_id: bank.item_id,
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

                if (syncError) {
                  console.error(`Error syncing account ${account.account_id}:`, syncError);
                } else {
                  console.log(`Successfully synced account ${account.account_id}, result:`, syncResult);
                }
              }

              // Use fresh data from Plaid
              accounts = accountsResponse.data.accounts.map(account => ({
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
                },
                last_plaid_sync: new Date().toISOString()
              }));

              // Fetch institution details for logo
              const institutionResponse = await plaidClient.institutionsGetById({
                institution_id: accountsResponse.data.item.institution_id,
                country_codes: ['US'],
                options: {
                  include_optional_metadata: true
                }
              });

              institution = {
                name: institutionResponse.data.institution.name,
                logo: institutionResponse.data.institution.logo,
                primary_color: institutionResponse.data.institution.primary_color,
                url: institutionResponse.data.institution.url,
              };

              console.log(`Institution data for ${bank.institution_name}:`, {
                name: institution.name,
                hasLogo: !!institution.logo,
                primaryColor: institution.primary_color
              });

              // Update last sync time in database
              await supabase
                .from('connected_banks')
                .update({ 
                  updated_at: new Date().toISOString(),
                  last_sync: new Date().toISOString()
                })
                .eq('id', bank.id);

            } catch (plaidError) {
              console.error(`Error fetching from Plaid for bank ${bank.id}:`, plaidError);
              // Fall back to cached data if available
              if (cachedAccounts && cachedAccounts.length > 0) {
                console.log(`Falling back to cached data for bank ${bank.institution_name}`);
                accounts = cachedAccounts.map(account => ({
                  account_id: account.plaid_account_id,
                  name: account.name,
                  official_name: account.official_name,
                  type: account.type,
                  subtype: account.subtype,
                  mask: account.mask,
                  balances: {
                    available: account.available_balance,
                    current: account.current_balance,
                    limit: account.credit_limit,
                    iso_currency_code: account.currency_code,
                  },
                  last_plaid_sync: account.last_plaid_sync
                }));
              }
            }
          }

          return {
            ...bank,
            accounts,
            institution,
            last_sync: shouldRefreshFromPlaid ? new Date().toISOString() : bank.last_sync,
            data_source: shouldRefreshFromPlaid ? 'plaid_fresh' : 'database_cached'
          };
        } catch (error) {
          console.error(`Error processing bank ${bank.id}:`, error);
          return {
            ...bank,
            accounts: [],
            error: error.message,
            last_sync: bank.updated_at,
            data_source: 'error'
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