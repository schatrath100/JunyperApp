/*
  # Fix vendor user_id assignment

  1. Changes
    - Create a default system user for existing records
    - Associate existing vendors with the system user
    - Make user_id column required
    
  2. Notes
    - Uses a safe approach to handle existing records
    - Ensures no null values before making column required
*/

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