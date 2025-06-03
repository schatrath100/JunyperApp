/*
  # Enable RLS for Account table

  1. Security Changes
    - Enable RLS on Account table
    - Add policy for authenticated users to read all accounts
    - Add policy for authenticated users to insert their own accounts
    - Add policy for authenticated users to update their own accounts

  2. Changes
    - Add user_id column to link accounts to users
    - Add created_at timestamp
*/

-- Add user_id and created_at columns
ALTER TABLE "Account" 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Enable RLS
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all accounts"
ON "Account"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own accounts"
ON "Account"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
ON "Account"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
