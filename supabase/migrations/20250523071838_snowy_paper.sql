/*
  # Add Company Legal Name field
  
  1. Changes
    - Add company_legal_name column to accounting_settings table
    - Set default value to empty string
    - Make column NOT NULL to ensure data consistency
*/

ALTER TABLE accounting_settings
ADD COLUMN IF NOT EXISTS company_legal_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN accounting_settings.company_legal_name IS 'Legal name of the company';