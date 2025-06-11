import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createLinkToken, exchangePublicToken, fetchTransactions } from '../src/lib/plaid';
import { supabase } from './supabase';

const app = express();
app.use(cors());
app.use(express.json());

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
app.post('/api/exchange_public_token', async (req, res) => {
  try {
    const { public_token, metadata, userId } = req.body;
    const { access_token, item_id } = await exchangePublicToken(public_token);

    // Save the access token and item ID to the database
    const { error } = await supabase
      .from('connected_banks')
      .insert({
        user_id: userId,
        item_id,
        access_token,
        institution_name: metadata.institution.name,
      });

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
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