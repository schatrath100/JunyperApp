/*
  # Add invoice_id to Transaction table
  
  1. Changes
    - Add invoice_id column to Transaction table to link transactions with invoices
    - Add foreign key constraint to ensure referential integrity
    - Add index for better query performance
*/

ALTER TABLE "Transaction" 
ADD COLUMN invoice_id bigint REFERENCES "SalesInvoice"(id);

CREATE INDEX transaction_invoice_id_idx ON "Transaction"(invoice_id);