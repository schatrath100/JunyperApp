-- Add new columns for deposit and withdrawal
ALTER TABLE bank_transactions
ADD COLUMN deposit DECIMAL(10,2) DEFAULT 0,
ADD COLUMN withdrawal DECIMAL(10,2) DEFAULT 0;

-- Migrate existing data
UPDATE bank_transactions
SET 
  deposit = CASE WHEN credit_debit_indicator = 'credit' THEN amount ELSE 0 END,
  withdrawal = CASE WHEN credit_debit_indicator = 'debit' THEN amount ELSE 0 END;

-- Remove old columns
ALTER TABLE bank_transactions
DROP COLUMN credit_debit_indicator,
DROP COLUMN amount; 