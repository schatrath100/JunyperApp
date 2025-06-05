/*
  # Fix Users Table RLS Policies

  1. Changes
    - Drop existing RLS policies for users table
    - Create new RLS policies that properly handle user signup and profile management
    
  2. Security
    - Enable RLS on users table
    - Add policies for:
      - Insert: Allow authenticated users to create their own profile during signup
      - Select: Users can only view their own profile
      - Update: Users can only update their own profile
      - Delete: Users can only delete their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable delete for users based on auth_id" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable select for users based on auth_id" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on auth_id" ON public.users;

-- Create new policies
CREATE POLICY "Enable insert during signup"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = auth_id
  OR 
  (
    -- Also allow insert during signup when auth_id matches the authenticated user
    auth.uid() IS NOT NULL 
    AND 
    auth_id = auth.uid()
  )
);

CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_id = auth.uid())
WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can delete own profile"
ON public.users
FOR DELETE
TO authenticated
USING (auth_id = auth.uid());