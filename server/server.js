const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
  'PLAID_CLIENT_ID',
  'PLAID_SECRET',
  'PLAID_ENV',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Log environment configuration (without sensitive values)
console.log('Environment configuration:');
console.log('- Plaid environment:', process.env.PLAID_ENV);
console.log('- Plaid client ID present:', !!process.env.PLAID_CLIENT_ID);
console.log('- Plaid secret present:', !!process.env.PLAID_SECRET);
console.log('- Supabase URL:', process.env.VITE_SUPABASE_URL);

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

const app = express();
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

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

// Create link token endpoint
app.post('/api/create_link_token', async (req, res) => {
  try {
    console.log('Received request to create link token');
    const userId = req.body.userId;
    if (!userId) {
      console.error('Missing userId in request');
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('Creating link token for user:', userId);
    const linkToken = await createLinkToken(userId);
    console.log('Link token created successfully');
    res.json(linkToken);
  } catch (error) {
    console.error('Error creating link token:', error?.response?.data || error);
    res.status(500).json({ 
      error: 'Failed to create link token',
      details: error?.response?.data?.error_message || error.message
    });
  }
});

// Exchange public token endpoint
app.post('/api/exchange_public_token', async (req, res) => {
  try {
    console.log('Received request to exchange public token');
    const { public_token, userId, institutionName } = req.body;
    if (!public_token || !userId || !institutionName) {
      console.error('Missing required fields in request');
      return res.status(400).json({ error: 'public_token, userId, and institutionName are required' });
    }

    console.log('Exchanging public token for access token');
    const response = await exchangePublicToken(public_token);
    
    console.log('Storing access token and institution name in Supabase');
    const { error } = await supabase
      .from('connected_banks')
      .upsert({
        user_id: userId,
        item_id: response.item_id,
        access_token: response.access_token,
        institution_name: institutionName,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing connected bank:', error);
      return res.status(500).json({ error: 'Failed to store connected bank details' });
    }

    console.log('Public token exchanged and bank details stored successfully');
    res.json({ success: true, item_id: response.item_id, access_token: response.access_token });
  } catch (error) {
    console.error('Error exchanging public token:', error?.response?.data || error);
    res.status(500).json({ 
      error: 'Failed to exchange public token',
      details: error?.response?.data?.error_message || error.message
    });
  }
});

// Fetch transactions endpoint
app.post('/api/fetch_transactions', async (req, res) => {
  try {
    console.log('Received request to fetch transactions');
    const { userId, startDate, endDate } = req.body;
    if (!userId || !startDate || !endDate) {
      console.error('Missing required fields in request');
      return res.status(400).json({ error: 'userId, startDate, and endDate are required' });
    }

    // Get access token from Supabase
    const { data: connectedBank, error } = await supabase
      .from('connected_banks')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (error || !connectedBank?.access_token) {
      console.error('No access token found for user:', error);
      return res.status(404).json({ error: 'No connected bank found for user' });
    }

    console.log('Fetching transactions for user:', userId);
    const response = await plaidClient.transactionsGet({
      access_token: connectedBank.access_token,
      start_date: startDate,
      end_date: endDate,
    });
    console.log('Transactions fetched successfully');
    res.json({ transactions: response.data });
  } catch (error) {
    console.error('Error fetching transactions:', error?.response?.data || error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error?.response?.data?.error_message || error.message
    });
  }
});

const PORT = process.env.PORT || 3001;

// Start the server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
}); 