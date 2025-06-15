/*
  # Update Transaction Account IDs
  
  This migration updates specific account_id values in the Transaction table:
  - Changes account_id 17 to 3
  - Changes account_id 18 to 16  
  - Changes account_id 25 to 19
  
  This is a data migration to correct account references.
*/

-- Update account_id from 17 to 3
UPDATE "Transaction" 
SET account_id = 3 
WHERE account_id = 17;

-- Update account_id from 18 to 16
UPDATE "Transaction" 
SET account_id = 16 
WHERE account_id = 18;

-- Update account_id from 25 to 19
UPDATE "Transaction" 
SET account_id = 19 
WHERE account_id = 25;

-- Optional: Add a comment to track this migration
COMMENT ON TABLE "Transaction" IS 'Account IDs updated on 2024-12-22: 17→3, 18→16, 25→19'; 