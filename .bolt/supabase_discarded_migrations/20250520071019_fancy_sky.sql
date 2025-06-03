/*
  # Update Account Type Column

  1. Changes
    - Modify the existing account_type column to add a default value and comment
    - Make the column non-nullable

  2. Notes
    - Ensures account_type has proper constraints and documentation
*/

ALTER TABLE "Account" 
  ALTER COLUMN account_type SET DEFAULT ''::text,
  ALTER COLUMN account_type SET NOT NULL,
  ALTER COLUMN account_type SET COMMENT 'account type';
