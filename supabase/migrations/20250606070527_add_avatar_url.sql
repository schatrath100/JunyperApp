/*
  # Add avatar_url to users table

  1. Changes
    - Add avatar_url column to users table
    - Column will store the URL of the user's avatar image
*/

-- Add avatar_url column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing users to use their profile avatar_url if available
UPDATE public.users u
SET avatar_url = p.avatar_url
FROM public.profiles p
WHERE u.auth_id = p.id
AND p.avatar_url IS NOT NULL; 