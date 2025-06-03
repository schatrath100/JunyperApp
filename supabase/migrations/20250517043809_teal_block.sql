/*
  # Add default value for account_type

  1. Changes
    - Add default value for account_type column
    - Make account_type NOT NULL
*/

ALTER TABLE "Account" 
ALTER COLUMN account_type SET DEFAULT '',
ALTER COLUMN account_type SET NOT NULL;
