-- Add soft delete functionality to bank_transactions table

-- Add soft delete columns
ALTER TABLE bank_transactions 
ADD COLUMN IF NOT EXISTS deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users;

-- Create function to soft delete bank transaction
CREATE OR REPLACE FUNCTION soft_delete_bank_transaction(transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bank_transactions 
  SET 
    deleted = true,
    deleted_at = now(),
    deleted_by = auth.uid()
  WHERE id = transaction_id 
    AND user_id = auth.uid()
    AND deleted = false;
END;
$$;

-- Create function to restore bank transaction
CREATE OR REPLACE FUNCTION restore_bank_transaction(transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bank_transactions 
  SET 
    deleted = false,
    deleted_at = null,
    deleted_by = null
  WHERE id = transaction_id 
    AND user_id = auth.uid();
END;
$$;

-- Create function to permanently delete old bank transactions
CREATE OR REPLACE FUNCTION cleanup_deleted_bank_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete transactions that have been soft deleted for more than 30 days
  DELETE FROM bank_transactions 
  WHERE deleted = true 
    AND deleted_at < now() - interval '30 days';
END;
$$;

-- Update RLS policies to exclude soft deleted records
DROP POLICY IF EXISTS "Users can view their own transactions" ON bank_transactions;
CREATE POLICY "Users can view their own transactions"
  ON bank_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted = false);

-- Add policy for viewing deleted transactions (optional - for admin/restore purposes)
CREATE POLICY "Users can view their own deleted transactions"
  ON bank_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND deleted = true);

-- Update policy for updates to allow soft delete
DROP POLICY IF EXISTS "Users can update transactions" ON bank_transactions;
CREATE POLICY "Users can update transactions"
  ON bank_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create view for active (non-deleted) bank transactions
CREATE OR REPLACE VIEW active_bank_transactions AS
SELECT * FROM bank_transactions 
WHERE deleted = false;

-- Grant permissions
GRANT EXECUTE ON FUNCTION soft_delete_bank_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_bank_transaction(uuid) TO authenticated;
GRANT SELECT ON active_bank_transactions TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS bank_transactions_deleted_idx ON bank_transactions(deleted);
CREATE INDEX IF NOT EXISTS bank_transactions_deleted_at_idx ON bank_transactions(deleted_at);

-- Add trigger to automatically update deleted_at timestamp
CREATE OR REPLACE FUNCTION update_bank_transaction_deleted_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted = true AND OLD.deleted = false THEN
    NEW.deleted_at = now();
    NEW.deleted_by = auth.uid();
  ELSIF NEW.deleted = false AND OLD.deleted = true THEN
    NEW.deleted_at = null;
    NEW.deleted_by = null;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bank_transaction_soft_delete_trigger
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_transaction_deleted_timestamp(); 