/*
  # Update Transaction Foreign Key Constraint
  
  This migration modifies the Transaction table to allow account_id to reference
  either the Account table or the systemAccounts table.
  
  Since PostgreSQL doesn't support foreign keys referencing multiple tables,
  we'll:
  1. Drop the existing foreign key constraint
  2. Create a check constraint with a function to validate the reference
  3. Add triggers to maintain referential integrity
*/

-- Drop the existing foreign key constraint
ALTER TABLE "Transaction" 
DROP CONSTRAINT IF EXISTS "Transaction_account_id_fkey";

-- Create a function to check if account_id exists in either table
CREATE OR REPLACE FUNCTION check_account_exists(account_id_param bigint)
RETURNS boolean AS $$
BEGIN
  -- Check if the account_id exists in either Account or systemAccounts table
  RETURN EXISTS (
    SELECT 1 FROM "Account" WHERE id = account_id_param
    UNION
    SELECT 1 FROM "systemAccounts" WHERE id = account_id_param
  );
END;
$$ LANGUAGE plpgsql;

-- Add a check constraint using the function
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_account_id_check" 
CHECK (check_account_exists(account_id));

-- Create a trigger function to prevent deletion of referenced accounts
CREATE OR REPLACE FUNCTION prevent_account_deletion()
RETURNS trigger AS $$
BEGIN
  -- Check if the account being deleted is referenced in Transaction table
  IF EXISTS (SELECT 1 FROM "Transaction" WHERE account_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete account with id % because it is referenced in Transaction table', OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on both Account and systemAccounts tables
DROP TRIGGER IF EXISTS prevent_account_deletion_trigger ON "Account";
CREATE TRIGGER prevent_account_deletion_trigger
  BEFORE DELETE ON "Account"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_account_deletion();

DROP TRIGGER IF EXISTS prevent_system_account_deletion_trigger ON "systemAccounts";
CREATE TRIGGER prevent_system_account_deletion_trigger
  BEFORE DELETE ON "systemAccounts"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_account_deletion();

-- Add comment to document the change
COMMENT ON CONSTRAINT "Transaction_account_id_check" ON "Transaction" 
IS 'Ensures account_id references either Account or systemAccounts table'; 