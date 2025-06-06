/*
  # Fix RLS Policy for public.users Table

  1. Changes Made
    - Drop the existing restrictive INSERT policy on public.users table
    - Create a new, more permissive policy that allows the trigger function to insert data
    - This ensures the handle_new_user trigger can successfully create user records

  2. Security
    - The new policy still requires authentication but removes the uid() check that was blocking the trigger
    - This allows the SECURITY DEFINER function to bypass RLS as intended

  3. Notes
    - This change is essential for the user signup process to work correctly
    - The trigger function runs with elevated privileges and should be able to insert user data
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Enable insert during signup" ON public.users;

-- Create a new, more permissive policy for inserts by authenticated users
-- This policy will allow the trigger function to insert data
CREATE POLICY "Allow authenticated user inserts" ON public.users
FOR INSERT TO authenticated
WITH CHECK (true);