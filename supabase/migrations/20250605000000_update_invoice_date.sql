/*
  # Change InvoiceDate to timestamptz in SalesInvoice table

  1. Changes
    - Change InvoiceDate column type from date to timestamptz
    - This allows for more precise timestamp storage with timezone information
*/

ALTER TABLE "SalesInvoice"
ALTER COLUMN "InvoiceDate" TYPE timestamptz USING "InvoiceDate"::timestamptz; 