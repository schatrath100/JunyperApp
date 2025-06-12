import { Configuration, PlaidApi, PlaidEnvironments, CountryCode, Products } from 'plaid';
import { supabase } from '../../server/supabase';

// Initialize the Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

// Log Plaid configuration (without sensitive data)
console.log('Initializing Plaid with environment:', process.env.PLAID_ENV || 'sandbox');
console.log('Plaid client ID present:', !!process.env.PLAID_CLIENT_ID);
console.log('Plaid secret present:', !!process.env.PLAID_SECRET);

export const plaidClient = new PlaidApi(configuration);

// Helper function to create a link token
export const createLinkToken = async (userId: string) => {
  try {
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      throw new Error('Missing Plaid credentials. Please check your environment variables.');
    }

    const request = {
      user: { client_user_id: userId },
      client_name: 'Junyper',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    console.log('Creating link token with request:', { ...request, user: { client_user_id: userId } });
    const response = await plaidClient.linkTokenCreate(request);
    console.log('Link token created successfully');
    return response.data;
  } catch (error: any) {
    console.error('Error creating link token:', error?.response?.data || error);
    throw new Error(error?.response?.data?.error_message || error.message || 'Failed to create link token');
  }
};

// Helper function to exchange public token for access token
export const exchangePublicToken = async (publicToken: string) => {
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
  } catch (error: any) {
    console.error('Error exchanging public token:', error?.response?.data || error);
    throw new Error(error?.response?.data?.error_message || error.message || 'Failed to exchange public token');
  }
};

// Helper function to fetch transactions
export const fetchTransactions = async (
  userId: string,
  startDate: string,
  endDate: string
) => {
  try {
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      throw new Error('Missing Plaid credentials. Please check your environment variables.');
    }

    // Get access token from Supabase
    const { data: plaidItem, error } = await supabase
      .from('plaid_items')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (error || !plaidItem?.access_token) {
      throw new Error('No access token found for user');
    }

    console.log('Fetching transactions for user:', userId);
    const response = await plaidClient.transactionsGet({
      access_token: plaidItem.access_token,
      start_date: startDate,
      end_date: endDate,
    });
    console.log('Transactions fetched successfully');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching transactions:', error?.response?.data || error);
    throw new Error(error?.response?.data?.error_message || error.message || 'Failed to fetch transactions');
  }
}; 