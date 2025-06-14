-- Add soft delete functionality to transaction_rules table
-- This migration adds deleted flag and deleted_at timestamp

-- Add new columns for soft delete
ALTER TABLE transaction_rules 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for better performance when filtering out deleted records
CREATE INDEX IF NOT EXISTS idx_transaction_rules_deleted ON transaction_rules(user_id, deleted);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_active ON transaction_rules(user_id) WHERE deleted = FALSE;

-- Create a view for active (non-deleted) transaction rules
CREATE OR REPLACE VIEW active_transaction_rules AS
SELECT 
    id,
    user_id,
    name,
    amount_min,
    amount_max,
    description_contains,
    bank_name,
    action,
    account_mapping,
    created_at,
    updated_at
FROM transaction_rules
WHERE deleted = FALSE;

-- Create function to soft delete transaction rules
CREATE OR REPLACE FUNCTION soft_delete_transaction_rule(
    p_rule_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE transaction_rules 
    SET 
        deleted = TRUE,
        deleted_at = NOW(),
        deleted_by = p_user_id
    WHERE id = p_rule_id 
    AND user_id = p_user_id 
    AND deleted = FALSE;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION soft_delete_transaction_rule TO authenticated;

-- Create function to restore (undelete) transaction rules
CREATE OR REPLACE FUNCTION restore_transaction_rule(
    p_rule_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE transaction_rules 
    SET 
        deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = p_rule_id 
    AND user_id = p_user_id 
    AND deleted = TRUE;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION restore_transaction_rule TO authenticated;

-- Create function to permanently delete old soft-deleted rules (cleanup)
CREATE OR REPLACE FUNCTION cleanup_deleted_transaction_rules()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Permanently delete rules that have been soft-deleted for more than 90 days
    DELETE FROM transaction_rules 
    WHERE deleted = TRUE 
    AND deleted_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION cleanup_deleted_transaction_rules TO authenticated;

-- Update RLS policies to exclude deleted records by default
DROP POLICY IF EXISTS "Users can view their own transaction rules" ON transaction_rules;
DROP POLICY IF EXISTS "Users can insert their own transaction rules" ON transaction_rules;
DROP POLICY IF EXISTS "Users can update their own transaction rules" ON transaction_rules;
DROP POLICY IF EXISTS "Users can delete their own transaction rules" ON transaction_rules;

-- Recreate policies with soft delete awareness
CREATE POLICY "Users can view their own active transaction rules"
    ON transaction_rules FOR SELECT
    USING (auth.uid() = user_id AND deleted = FALSE);

CREATE POLICY "Users can view their own deleted transaction rules"
    ON transaction_rules FOR SELECT
    USING (auth.uid() = user_id AND deleted = TRUE);

CREATE POLICY "Users can insert their own transaction rules"
    ON transaction_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id AND deleted = FALSE);

CREATE POLICY "Users can update their own active transaction rules"
    ON transaction_rules FOR UPDATE
    USING (auth.uid() = user_id AND deleted = FALSE)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete their own transaction rules"
    ON transaction_rules FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add comment to document the soft delete approach
COMMENT ON COLUMN transaction_rules.deleted IS 'Soft delete flag - when TRUE, the rule is considered deleted but preserved for audit trail';
COMMENT ON COLUMN transaction_rules.deleted_at IS 'Timestamp when the rule was soft deleted';
COMMENT ON COLUMN transaction_rules.deleted_by IS 'User who performed the soft delete operation';

-- Add trigger to automatically set deleted_at when deleted is set to TRUE
CREATE OR REPLACE FUNCTION set_deleted_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- If deleted is being set to TRUE and deleted_at is not already set
    IF NEW.deleted = TRUE AND OLD.deleted = FALSE THEN
        NEW.deleted_at = NOW();
        NEW.deleted_by = auth.uid();
    END IF;
    
    -- If deleted is being set to FALSE (restore), clear the deleted fields
    IF NEW.deleted = FALSE AND OLD.deleted = TRUE THEN
        NEW.deleted_at = NULL;
        NEW.deleted_by = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_deleted_at ON transaction_rules;
CREATE TRIGGER trigger_set_deleted_at
    BEFORE UPDATE ON transaction_rules
    FOR EACH ROW
    EXECUTE FUNCTION set_deleted_at_trigger(); 