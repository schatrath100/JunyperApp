/*
  # Create Accounting Settings Table
  
  1. New Tables
    - `accounting_settings`
      - `id` (uuid, primary key)
      - `base_currency` (text)
      - `accounting_method` (text)
      - `time_zone` (text)
      - `sales_revenue_account` (bigint, references Account)
      - `purchases_account` (bigint, references Account)
      - `discounts_account` (bigint, references Account)
      - `accounts_receivable_account` (bigint, references Account)
      - `accounts_payable_account` (bigint, references Account)
      - `taxes_payable_account` (bigint, references Account)
      - `retained_earnings_account` (bigint, references Account)
      - `bank_name` (text)
      - `branch_name` (text)
      - `account_number` (text)
      - `is_default_bank` (boolean)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their own settings
*/

CREATE TABLE IF NOT EXISTS accounting_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'USD',
  accounting_method text NOT NULL DEFAULT 'Accrual',
  time_zone text NOT NULL DEFAULT 'US/Eastern',
  sales_revenue_account bigint REFERENCES "Account"(id),
  purchases_account bigint REFERENCES "Account"(id),
  discounts_account bigint REFERENCES "Account"(id),
  accounts_receivable_account bigint REFERENCES "Account"(id),
  accounts_payable_account bigint REFERENCES "Account"(id),
  taxes_payable_account bigint REFERENCES "Account"(id),
  retained_earnings_account bigint REFERENCES "Account"(id),
  bank_name text,
  branch_name text,
  account_number text,
  is_default_bank boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE accounting_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own settings"
  ON accounting_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their settings"
  ON accounting_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON accounting_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounting_settings_updated_at
    BEFORE UPDATE ON accounting_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();