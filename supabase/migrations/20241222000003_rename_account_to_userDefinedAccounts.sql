/*
  # Rename Account table to userDefinedAccounts
  
  This migration renames the Account table to userDefinedAccounts while preserving:
  - All data
  - All constraints
  - All indexes
  - All triggers
  - All RLS policies
  - All relationships
*/

-- Step 1: Rename the table
ALTER TABLE "Account" RENAME TO "userDefinedAccounts";

-- Step 2: Update the sequence name to match the new table name
ALTER SEQUENCE "Account_id_seq" RENAME TO "userDefinedAccounts_id_seq";

-- Step 3: Update any constraints that reference the old table name
-- (Most constraints will automatically update, but we'll be explicit)

-- Step 4: Update the check function to reference the new table name
CREATE OR REPLACE FUNCTION check_account_exists(account_id_param bigint)
RETURNS boolean AS $$
BEGIN
  -- Check if the account_id exists in either userDefinedAccounts or systemAccounts table
  RETURN EXISTS (
    SELECT 1 FROM "userDefinedAccounts" WHERE id = account_id_param
    UNION
    SELECT 1 FROM "systemAccounts" WHERE id = account_id_param
  );
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update the trigger function to reference the new table name in error messages
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

-- Step 6: Drop and recreate the trigger on the renamed table
DROP TRIGGER IF EXISTS prevent_account_deletion_trigger ON "userDefinedAccounts";
CREATE TRIGGER prevent_account_deletion_trigger
  BEFORE DELETE ON "userDefinedAccounts"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_account_deletion();

-- Step 7: Update RLS policies (if any exist)
-- Note: RLS policies are automatically transferred with the table rename

-- Step 8: Add comment to document the change
COMMENT ON TABLE "userDefinedAccounts" IS 'User-defined accounts table (renamed from Account on 2024-12-22)'; 