const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const { createClient } = require('@supabase/supabase-js');

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

exports.handler = async (event, context) => {
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
    console.log('Received request to fetch transactions');
    const body = JSON.parse(event.body || '{}');
    const { userId, startDate, endDate } = body;
    
    if (!userId || !startDate || !endDate) {
      console.error('Missing required fields in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId, startDate, and endDate are required' }),
      };
    }

    // Get access token from Supabase
    const { data: connectedBank, error } = await supabase
      .from('connected_banks')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (error || !connectedBank?.access_token) {
      console.error('No access token found for user:', error);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No connected bank found for user' }),
      };
    }

    console.log('Fetching transactions for user:', userId);
    const response = await plaidClient.transactionsGet({
      access_token: connectedBank.access_token,
      start_date: startDate,
      end_date: endDate,
    });
    console.log('Transactions fetched successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ transactions: response.data }),
    };
  } catch (error) {
    console.error('Error fetching transactions:', error?.response?.data || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch transactions',
        details: error?.response?.data?.error_message || error.message
      }),
    };
  }
}; 