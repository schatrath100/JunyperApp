/*
  # Add Bank Transactions Table

  1. New Tables
    - `bank_transactions`
      - `id` (uuid, primary key)
      - `date` (date, not null)
      - `bank_name` (text, not null)
      - `description` (text, not null)
      - `amount` (numeric, not null)
      - `account_number` (numeric, not null)
      - `credit_debit_indicator` (text, not null)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `bank_transactions` table
    - Add policies for authenticated users to:
      - Read their own transactions
      - Insert new transactions
*/

CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  bank_name text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  account_number numeric NOT NULL,
  credit_debit_indicator text NOT NULL CHECK (credit_debit_indicator IN ('credit', 'debit')),
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own transactions"
  ON bank_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert transactions"
  ON bank_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX bank_transactions_user_id_idx ON bank_transactions(user_id);
CREATE INDEX bank_transactions_date_idx ON bank_transactions(date);