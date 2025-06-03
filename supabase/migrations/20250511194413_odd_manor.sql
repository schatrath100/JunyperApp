/*
  # Create Sales Items table

  1. New Tables
    - `SaleItems` table to store sales item data
      - `id` (uuid, primary key)
      - `Item_Name` (text, unique)
      - `Item_Desc` (text)
      - `Item_Number` (text)
      - `Item_Price` (numeric)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on SaleItems table
    - Add policies for authenticated users to:
      - Read all items
      - Insert new items
      - Update items
      - Delete items
*/

CREATE TABLE IF NOT EXISTS "SaleItems" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "Item_Name" text UNIQUE NOT NULL,
  "Item_Desc" text,
  "Item_Number" text,
  "Item_Price" numeric,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "SaleItems" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all items"
  ON "SaleItems"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert items"
  ON "SaleItems"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update items"
  ON "SaleItems"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete items"
  ON "SaleItems"
  FOR DELETE
  TO authenticated
  USING (true);
