/*
  # Add delete policy for customers

  1. Security Changes
    - Add policy to allow authenticated users to delete customers
*/

CREATE POLICY "Users can delete customers"
ON "Customer"
FOR DELETE
TO authenticated
USING (true);