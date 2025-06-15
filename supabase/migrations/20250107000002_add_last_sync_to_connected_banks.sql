-- Add last_sync column to connected_banks table
ALTER TABLE connected_banks ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE;

-- Create index for last_sync for performance
CREATE INDEX IF NOT EXISTS idx_connected_banks_last_sync ON connected_banks(last_sync);

-- Update existing records to set last_sync to updated_at (as a reasonable default)
UPDATE connected_banks SET last_sync = updated_at WHERE last_sync IS NULL; 