/*
  # Fix vendor user_id and RLS policies

  1. Changes
    - Create a system user if it doesn't exist
    - Associate existing vendor records with the system user
    - Make user_id column required
    - Update RLS policies to properly enforce user-based access

  2. Notes
    - Uses a transaction to ensure data consistency
    - Handles existing records safely
    - Enforces proper access control
*/

BEGIN;

-- Create a system user if it doesn't exist
DO $$ 
DECLARE
  system_user_id uuid;
BEGIN
  -- First try to find an existing system user
  SELECT id INTO system_user_id
  FROM auth.users
  WHERE email = 'system@example.com'
  LIMIT 1;
  
  -- If no system user exists, create one
  IF system_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'system@example.com',
      crypt('system-password', gen_salt('bf')),
      now(),
      now(),
      now()
    )
    RETURNING id INTO system_user_id;
  END IF;

  -- Update all vendors without user_id to use the system user
  UPDATE "Vendor"
  SET user_id = system_user_id
  WHERE user_id IS NULL;
END $$;

-- Now make user_id required
ALTER TABLE "Vendor"
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own vendors" ON "Vendor";
DROP POLICY IF EXISTS "Users can insert own vendors" ON "Vendor";
DROP POLICY IF EXISTS "Users can update own vendors" ON "Vendor";
DROP POLICY IF EXISTS "Users can delete own vendors" ON "Vendor";

-- Create stricter RLS policies
CREATE POLICY "Users can view own vendors"
ON "Vendor"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vendors"
ON "Vendor"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendors"
ON "Vendor"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vendors"
ON "Vendor"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

COMMIT;