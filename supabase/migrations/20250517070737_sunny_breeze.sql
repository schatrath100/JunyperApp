/*
  # Add Transaction-Account Relationship

  1. Changes
    - Modify account_id column in Transaction table to match Account table's id type
    - Add foreign key constraint between Transaction and Account tables
  
  2. Notes
    - Uses safe column type modification approach
    - Adds proper foreign key relationship
*/

-- Modify account_id column type to match Account table
ALTER TABLE "Transaction" 
ALTER COLUMN account_id TYPE bigint 
USING account_id::bigint;

-- Add foreign key constraint
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_account_id_fkey"
FOREIGN KEY (account_id) 
REFERENCES "Account"(id);
