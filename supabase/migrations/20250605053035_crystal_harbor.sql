/*
  # Fix users table RLS policies

  1. Changes
    - Drop existing RLS policies for users table
    - Create new policies that properly handle user sign-up and profile management
    
  2. Security
    - Enable RLS on users table
    - Add policy for new user sign-up
    - Add policies for authenticated users to manage their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert during signup" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- Create new policies
CREATE POLICY "Enable insert during signup"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = auth_id
  OR
  -- Allow new sign-ups to create their profile
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth_id
    AND id = auth.uid()
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