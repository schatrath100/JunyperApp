/*
  # Update Account type column constraints
  
  1. Changes
    - Set default value for account_type to empty string
    - Make account_type column NOT NULL
    - Add column comment for documentation
*/

ALTER TABLE "Account" 
  ALTER COLUMN account_type SET DEFAULT ''::text,
  ALTER COLUMN account_type SET NOT NULL;

COMMENT ON COLUMN "Account".account_type IS 'account type';
