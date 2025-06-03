/*
  # Add delete policy for bank transactions
  
  1. Security Changes
    - Add policy for authenticated users to delete their own bank transactions
    - Users can only delete transactions they created
*/

CREATE POLICY "Users can delete their own transactions"
  ON bank_transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
