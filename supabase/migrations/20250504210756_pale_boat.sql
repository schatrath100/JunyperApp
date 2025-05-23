/*
  # Create users table and sync triggers

  1. New Tables
    - `users` table to store user profile data synced from auth.users
      - `id` (uuid, primary key)
      - `auth_id` (uuid, references auth.users)
      - `full_name` (text)
      - `email` (text)
      - `phone` (text)
      - `address` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on users table
    - Add policies for authenticated users to read/update their own data
    - Add trigger to sync auth.users metadata changes
*/

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id uuid REFERENCES auth.users(id) UNIQUE,
    full_name text,
    email text,
    phone text,
    address text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create function to handle user metadata updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (auth_id, full_name, email, phone, address)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'address'
    )
    ON CONFLICT (auth_id) 
    DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Backfill existing users
INSERT INTO public.users (auth_id, full_name, email, phone, address)
SELECT 
    id as auth_id,
    raw_user_meta_data->>'full_name' as full_name,
    email,
    raw_user_meta_data->>'phone' as phone,
    raw_user_meta_data->>'address' as address
FROM auth.users
ON CONFLICT (auth_id) DO NOTHING;