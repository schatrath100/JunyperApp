/*
  # Update users table RLS policies

  1. Changes
    - Modify INSERT policy to allow new users to create their profile during signup
    - Keep existing policies for SELECT, UPDATE, and DELETE

  2. Security
    - Users can only insert their own profile where auth_id matches their uid
    - Maintains existing security for other operations
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Enable insert during signup" ON public.users;

-- Create new INSERT policy that allows users to create their profile during signup
CREATE POLICY "Enable insert during signup"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow insert if auth_id matches the authenticated user's ID
  auth.uid() = auth_id
);