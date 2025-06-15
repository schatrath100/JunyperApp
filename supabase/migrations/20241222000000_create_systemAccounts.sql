/*
  # Create systemAccounts table
  
  1. New Tables
    - `systemAccounts` - An exact replica of the Account table structure
    - This table will contain system-wide accounts that all users can view but not edit
    
  2. Data Migration
    - Copy all existing records from Account table to systemAccounts
    - Remove user_id constraint for systemAccounts (global access)
    
  3. Security
    - Enable RLS on systemAccounts table
    - Add policy for all authenticated users to read systemAccounts
    - No insert/update/delete policies (read-only for users)
*/

-- Create systemAccounts table with same structure as Account table
CREATE TABLE IF NOT EXISTS "systemAccounts" (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  account_name text NOT NULL,
  account_group text NOT NULL,
  account_description text NOT NULL,
  account_type text NOT NULL DEFAULT ''::text,
  created_at timestamptz DEFAULT now()
);

-- Add comment to distinguish from user accounts
COMMENT ON TABLE "systemAccounts" IS 'System-wide accounts visible to all users but not editable';
COMMENT ON COLUMN "systemAccounts".account_type IS 'account type';

-- Enable RLS
ALTER TABLE "systemAccounts" ENABLE ROW LEVEL SECURITY;

-- Create policy for all authenticated users to read systemAccounts
CREATE POLICY "All users can view system accounts"
ON "systemAccounts"
FOR SELECT
TO authenticated
USING (true);

-- Copy all existing records from Account table to systemAccounts
-- Note: We don't copy user_id since systemAccounts are global
INSERT INTO "systemAccounts" (account_name, account_group, account_description, account_type, created_at)
SELECT 
  account_name, 
  account_group, 
  account_description, 
  account_type,
  COALESCE(created_at, now())
FROM "Account"
WHERE account_name IS NOT NULL 
  AND account_group IS NOT NULL 
  AND account_description IS NOT NULL
ON CONFLICT DO NOTHING; 