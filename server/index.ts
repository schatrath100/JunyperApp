import 'dotenv/config';
import express from 'express';
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

// Create a link token
app.post('/api/create_link_token', async (req, res) => {
  try {
    const { userId } = req.body;
    const response = await createLinkToken(userId);
    res.json(response);
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Exchange public token for access token
app.post('/api/exchange_public_token', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Received exchange_public_token request:', {
      body: req.body,
      headers: req.headers
    });

    const { public_token, metadata, userId } = req.body;
    
    if (!public_token || !metadata || !userId) {
      console.error('Missing required fields:', { 
        public_token: !!public_token, 
        metadata: !!metadata, 
        userId: !!userId,
        body: req.body 
      });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      console.error('Missing Plaid credentials:', {
        hasClientId: !!process.env.PLAID_CLIENT_ID,
        hasSecret: !!process.env.PLAID_SECRET
      });
      throw new Error('Missing Plaid credentials');
    }

    console.log('Exchanging public token for access token...');
    try {
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: public_token
      });
      
      const accessToken = exchangeResponse.data.access_token;
      const itemId = exchangeResponse.data.item_id;
      
      console.log('Successfully exchanged token. Item ID:', itemId);
      
      // Get institution details
      console.log('Fetching institution details...');
      const institutionResponse = await plaidClient.institutionsGetById({
        institution_id: metadata.institution.institution_id,
        country_codes: [CountryCode.Us],
        options: {
          include_optional_metadata: true
        }
      });
      
      const institutionName = institutionResponse.data.institution.name;
      console.log('Institution name:', institutionName);

      // Save to Supabase
      console.log('Saving bank data to Supabase...');
      const { data: bankData, error: dbError } = await supabase
        .from('connected_banks')
        .insert([
          {
            user_id: userId,
            access_token: accessToken,
            item_id: itemId,
            institution_name: institutionName,
            status: 'active'
          }
        ])
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        if (dbError.code === '42501') {
          throw new Error('Permission denied: Please check Supabase RLS policies');
        }
        throw dbError;
      }

      console.log('Successfully saved bank data:', bankData);
      res.json({ success: true, bank: bankData });
    } catch (plaidError) {
      console.error('Plaid API error:', plaidError);
      throw plaidError;
    }
  } catch (error) {
    console.error('Error in exchange_public_token:', error);
    res.status(500).json({ 
      error: 'Failed to exchange token',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Fetch transactions
app.post('/api/fetch_transactions', async (req, res) => {
  try {
    const { userId, bankId, startDate, endDate } = req.body;

    // Get the access token from the database
    const { data: bank, error: bankError } = await supabase
      .from('connected_banks')
      .select('access_token')
      .eq('id', bankId)
      .eq('user_id', userId)
      .single();

    if (bankError || !bank) {
      throw new Error('Bank not found');
    }

    const response = await fetchTransactions(bank.access_token, startDate, endDate);
    res.json({ transactions: response.transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 