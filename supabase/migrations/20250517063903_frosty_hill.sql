/*
  # Add Required Accounts for Invoice Transactions

  1. New Data
    - Add 'Accounts Receivable', 'Sales Income', and 'Cash' accounts to the Account table
    - These accounts are required for invoice transaction processing

  2. Changes
    - Insert new accounts only if they don't already exist
    - Set appropriate account types and descriptions
*/

DO $$ 
BEGIN
  -- Add Accounts Receivable if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM "Account" 
    WHERE account_name = 'Accounts Receivable'
  ) THEN
    INSERT INTO "Account" (
      id,
      account_name,
      account_type,
      account_description,
      account_group
    ) VALUES (
      1,
      'Accounts Receivable',
      'Asset',
      'Account for tracking money owed by customers',
      'Current Assets'
    );
  END IF;

  -- Add Sales Income if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM "Account" 
    WHERE account_name = 'Sales Income'
  ) THEN
    INSERT INTO "Account" (
      id,
      account_name,
      account_type,
      account_description,
      account_group
    ) VALUES (
      2,
      'Sales Income',
      'Revenue',
      'Account for tracking sales revenue',
      'Income'
    );
  END IF;

  -- Add Cash if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM "Account" 
    WHERE account_name = 'Cash'
  ) THEN
    INSERT INTO "Account" (
      id,
      account_name,
      account_type,
      account_description,
      account_group
    ) VALUES (
      3,
      'Cash',
      'Asset',
      'Account for tracking cash on hand',
      'Current Assets'
    );
  END IF;
END $$;
