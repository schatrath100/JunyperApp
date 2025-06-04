/*
  # Add user-based access control for Transactions table

  1. Changes
    - Add user_id column to Transaction table
    - Add foreign key constraint to auth.users
    - Create index for better query performance
    - Update RLS policies to enforce user-based access

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - View only their own transactions
      - Insert transactions with their user_id
      - Update their own transactions
      - Delete their own transactions
*/

-- Add user_id column
ALTER TABLE "Transaction"
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX transaction_user_id_idx ON "Transaction"(user_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert transactions" ON "Transaction";
DROP POLICY IF EXISTS "Users can read transactions" ON "Transaction";
DROP POLICY IF EXISTS "Users can update transactions" ON "Transaction";
DROP POLICY IF EXISTS "Users can delete transactions" ON "Transaction";

-- Create new policies
CREATE POLICY "Users can view own transactions"
ON "Transaction"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
ON "Transaction"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
ON "Transaction"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
ON "Transaction"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Update existing transactions to use the system user
DO $$ 
DECLARE
  system_user_id uuid;
BEGIN
  -- Get the system user ID
  SELECT id INTO system_user_id
  FROM auth.users
  WHERE email = 'system@example.com'
  LIMIT 1;

  -- Update transactions without user_id
  UPDATE "Transaction"
  SET user_id = system_user_id
  WHERE user_id IS NULL;
END $$;