import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import { createLinkToken, exchangePublicToken, fetchTransactions } from '../src/lib/plaid';
import { supabase } from './supabase';
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from 'plaid';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: new URL('../.env', import.meta.url).pathname });

// Validate required environment variables
const requiredEnvVars = [
  'PLAID_CLIENT_ID',
  'PLAID_SECRET',
  'PLAID_ENV',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
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
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
console.log('Initializing Supabase client with URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(cors());
app.use(express.json());

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

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

const createLinkTokenHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received request to create link token');
    const userId = req.body.userId;
    if (!userId) {
      console.error('Missing userId in request');
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    console.log('Creating link token for user:', userId);
    const linkToken = await createLinkToken(userId);
    console.log('Link token created successfully');
    res.json(linkToken);
  } catch (error: any) {
    console.error('Error creating link token:', error?.response?.data || error);
    res.status(500).json({ 
      error: 'Failed to create link token',
      details: error?.response?.data?.error_message || error.message
    });
  }
};

const exchangePublicTokenHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received request to exchange public token');
    const { publicToken, userId } = req.body;
    if (!publicToken || !userId) {
      console.error('Missing required fields in request');
      res.status(400).json({ error: 'publicToken and userId are required' });
      return;
    }

    console.log('Exchanging public token for access token');
    const response = await exchangePublicToken(publicToken);
    
    console.log('Storing access token in Supabase');
    const { error } = await supabase
      .from('plaid_items')
      .upsert({
        user_id: userId,
        item_id: response.item_id,
        access_token: response.access_token,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing access token:', error);
      res.status(500).json({ error: 'Failed to store access token' });
      return;
    }

    console.log('Public token exchanged successfully');
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error exchanging public token:', error?.response?.data || error);
    res.status(500).json({ 
      error: 'Failed to exchange public token',
      details: error?.response?.data?.error_message || error.message
    });
  }
};

const fetchTransactionsHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Received request to fetch transactions');
    const { userId, startDate, endDate } = req.body;
    if (!userId || !startDate || !endDate) {
      console.error('Missing required fields in request');
      res.status(400).json({ error: 'userId, startDate, and endDate are required' });
      return;
    }

    console.log('Fetching transactions for user:', userId);
    const transactions = await fetchTransactions(userId, startDate, endDate);
    console.log('Transactions fetched successfully');
    res.json({ transactions });
  } catch (error: any) {
    console.error('Error fetching transactions:', error?.response?.data || error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error?.response?.data?.error_message || error.message
    });
  }
};

app.post('/api/create_link_token', createLinkTokenHandler);
app.post('/api/exchange_public_token', exchangePublicTokenHandler);
app.post('/api/fetch_transactions', fetchTransactionsHandler);

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
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
}); 