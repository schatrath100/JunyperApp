/*
  # Add user_id and RLS to remaining tables
  
  1. Changes
    - Add user_id column to SaleItems, Vendor, VendorInvoice, and PurchaseItems tables
    - Add foreign key constraints to auth.users
    - Create indexes for better query performance
    - Enable RLS on all tables
    - Add user-based policies for CRUD operations
*/

-- SaleItems table
ALTER TABLE "SaleItems"
ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE INDEX sale_items_user_id_idx ON "SaleItems"(user_id);

-- Vendor table
ALTER TABLE "Vendor"
ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE INDEX vendor_user_id_idx ON "Vendor"(user_id);

-- VendorInvoice table
ALTER TABLE "VendorInvoice"
ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE INDEX vendor_invoice_user_id_idx ON "VendorInvoice"(user_id);

-- PurchaseItems table
ALTER TABLE "PurchaseItems"
ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE INDEX purchase_items_user_id_idx ON "PurchaseItems"(user_id);

-- Drop existing policies
DO $$ 
BEGIN
    -- SaleItems
    DROP POLICY IF EXISTS "Users can view all items" ON "SaleItems";
    DROP POLICY IF EXISTS "Users can insert items" ON "SaleItems";
    DROP POLICY IF EXISTS "Users can update items" ON "SaleItems";
    DROP POLICY IF EXISTS "Users can delete items" ON "SaleItems";

    -- Vendor
    DROP POLICY IF EXISTS "Users can view all vendors" ON "Vendor";
    DROP POLICY IF EXISTS "Users can insert vendors" ON "Vendor";
    DROP POLICY IF EXISTS "Users can update vendors" ON "Vendor";
    DROP POLICY IF EXISTS "Users can delete vendors" ON "Vendor";

    -- VendorInvoice
    DROP POLICY IF EXISTS "Users can view all bills" ON "VendorInvoice";
    DROP POLICY IF EXISTS "Users can insert bills" ON "VendorInvoice";
    DROP POLICY IF EXISTS "Users can update bills" ON "VendorInvoice";
    DROP POLICY IF EXISTS "Users can delete bills" ON "VendorInvoice";

    -- PurchaseItems
    DROP POLICY IF EXISTS "Users can view all purchase items" ON "PurchaseItems";
    DROP POLICY IF EXISTS "Users can insert purchase items" ON "PurchaseItems";
    DROP POLICY IF EXISTS "Users can update purchase items" ON "PurchaseItems";
    DROP POLICY IF EXISTS "Users can delete purchase items" ON "PurchaseItems";
END $$;

-- Create new policies for SaleItems
CREATE POLICY "Users can view own items"
ON "SaleItems"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
ON "SaleItems"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
ON "SaleItems"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
ON "SaleItems"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create new policies for Vendor
CREATE POLICY "Users can view own vendors"
ON "Vendor"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vendors"
ON "Vendor"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendors"
ON "Vendor"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vendors"
ON "Vendor"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create new policies for VendorInvoice
CREATE POLICY "Users can view own bills"
ON "VendorInvoice"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bills"
ON "VendorInvoice"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bills"
ON "VendorInvoice"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bills"
ON "VendorInvoice"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create new policies for PurchaseItems
CREATE POLICY "Users can view own purchase items"
ON "PurchaseItems"
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchase items"
ON "PurchaseItems"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchase items"
ON "PurchaseItems"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchase items"
ON "PurchaseItems"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);