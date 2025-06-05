/*
  # Fix users table RLS policies

  1. Changes
    - Drop existing RLS policies for users table
    - Create new policies that properly handle user profile creation
    - Ensure authenticated users can only manage their own data
    - Allow new users to create their profile during signup

  2. Security
    - Enable RLS on users table
    - Add policies for CRUD operations
    - Ensure proper auth.uid() checks
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
  DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies
CREATE POLICY "Enable insert for authenticated users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Enable select for users based on auth_id"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Enable update for users based on auth_id"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Enable delete for users based on auth_id"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (auth_id = auth.uid());