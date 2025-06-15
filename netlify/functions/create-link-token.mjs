import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

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

// Helper function to create a link token
const createLinkToken = async (userId) => {
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
      account_filters: {
        depository: {
          account_subtypes: ['checking', 'savings']
        }
      }
    };

    console.log('Creating link token with request:', { ...request, user: { client_user_id: userId } });
    const response = await plaidClient.linkTokenCreate(request);
    console.log('Link token created successfully');
    return response.data;
  } catch (error) {
    console.error('Error creating link token:', error?.response?.data || error);
    throw new Error(error?.response?.data?.error_message || error.message || 'Failed to create link token');
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
    console.log('Received request to create link token');
    const body = JSON.parse(event.body || '{}');
    const userId = body.userId;
    
    if (!userId) {
      console.error('Missing userId in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' }),
      };
    }

    console.log('Creating link token for user:', userId);
    const linkToken = await createLinkToken(userId);
    console.log('Link token created successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(linkToken),
    };
  } catch (error) {
    console.error('Error creating link token:', error?.response?.data || error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create link token',
        details: error?.response?.data?.error_message || error.message
      }),
    };
  }
}; 