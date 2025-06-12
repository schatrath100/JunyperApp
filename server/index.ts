import 'dotenv/config';
import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import { createLinkToken, exchangePublicToken, fetchTransactions } from '../src/lib/plaid';
import { supabase } from './supabase';
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from 'plaid';

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

const createLinkTokenHandler: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.body;
    const token = await createLinkToken(userId);
    res.json({ link_token: token });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
};

const exchangePublicTokenHandler: RequestHandler = async (req, res) => {
  try {
    const { public_token, metadata, userId } = req.body;
    const response = await exchangePublicToken(public_token);
    
    // Save bank data to Supabase
    const { error } = await supabase
      .from('connected_banks')
      .insert({
        user_id: userId,
        item_id: response.item_id,
        access_token: response.access_token,
        institution_name: metadata.institution?.name || 'Unknown Institution',
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    
    res.json({ 
      success: true,
      bank: {
        id: response.item_id,
        name: metadata.institution?.name || 'Unknown Institution'
      }
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    res.status(500).json({ error: 'Failed to exchange public token' });
  }
};

const fetchTransactionsHandler: RequestHandler = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.body;
    const transactions = await fetchTransactions(userId, startDate, endDate);
    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

app.post('/api/create_link_token', createLinkTokenHandler);
app.post('/api/exchange_public_token', exchangePublicTokenHandler);
app.post('/api/fetch_transactions', fetchTransactionsHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 