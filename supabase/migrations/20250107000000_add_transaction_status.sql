/*
  # Add Transaction Status Column to Bank Transactions

  1. Changes
    - Add transactionStatus column to bank_transactions table
    - Set default value to 'New'
    - Add check constraint for valid status values
    - Update all existing records to have 'New' status
    
  2. Status Values
    - New (default)
    - Categorized
    - Reconciled
    - Excluded
    - Cancelled
*/

-- Add the transactionStatus column with check constraint
ALTER TABLE bank_transactions 
ADD COLUMN IF NOT EXISTS transaction_status TEXT DEFAULT 'New';

-- Add check constraint for valid transaction status values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'bank_transactions_transaction_status_check'
    ) THEN
        ALTER TABLE bank_transactions 
        ADD CONSTRAINT bank_transactions_transaction_status_check 
        CHECK (transaction_status IN ('New', 'Categorized', 'Reconciled', 'Excluded', 'Cancelled'));
    END IF;
END $$;

-- Update all existing records to have 'New' status
UPDATE bank_transactions 
SET transaction_status = 'New' 
WHERE transaction_status IS NULL;

-- Make transaction_status NOT NULL after setting defaults
ALTER TABLE bank_transactions 
ALTER COLUMN transaction_status SET NOT NULL;

-- Create index for better query performance on transaction status
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status 
ON bank_transactions(transaction_status);

-- Add comment for documentation
COMMENT ON COLUMN bank_transactions.transaction_status IS 'Transaction processing status: New, Categorized, Reconciled, Excluded, or Cancelled'; 