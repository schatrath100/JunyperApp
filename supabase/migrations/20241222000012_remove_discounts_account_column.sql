/*
  # Remove unused discounts_account column from accounting_settings
  
  This migration removes the discounts_account column and its associated constraints
  since it's not being used in the application.
*/

-- First, check if the column exists and show current state
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_settings' 
        AND column_name = 'discounts_account'
    ) THEN
        RAISE NOTICE 'discounts_account column exists - will be removed';
        
        -- Show current values in the column (if any)
        DECLARE
            non_null_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO non_null_count 
            FROM accounting_settings 
            WHERE discounts_account IS NOT NULL;
            
            RAISE NOTICE 'Records with non-null discounts_account: %', non_null_count;
        END;
    ELSE
        RAISE NOTICE 'discounts_account column does not exist - nothing to remove';
    END IF;
END $$;

-- Drop the check constraint for discounts_account if it exists
ALTER TABLE accounting_settings 
DROP CONSTRAINT IF EXISTS accounting_settings_discounts_account_check;

-- Drop the column
ALTER TABLE accounting_settings 
DROP COLUMN IF EXISTS discounts_account;

-- Verify the column was removed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_settings' 
        AND column_name = 'discounts_account'
    ) THEN
        RAISE NOTICE '✅ SUCCESS: discounts_account column has been removed';
    ELSE
        RAISE WARNING '⚠️  discounts_account column still exists';
    END IF;
END $$;

-- Show remaining constraints on accounting_settings table
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'accounting_settings' 
ORDER BY constraint_type, constraint_name; 