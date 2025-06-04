/*
  # Backfill vendor user IDs
  
  1. Changes
    - Update existing vendor records to associate with their creators
    - Set user_id NOT NULL constraint after backfill
*/

-- First, ensure all existing vendors have a user_id
UPDATE "Vendor"
SET user_id = auth.uid()
WHERE user_id IS NULL;

-- Now make user_id required
ALTER TABLE "Vendor"
ALTER COLUMN user_id SET NOT NULL;