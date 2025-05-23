/*
  # Add account type column to Account table

  1. Changes
    - Add account_type column to Account table
    - Set default value to null
    - Make it nullable
*/

ALTER TABLE "Account" ADD COLUMN account_type text;