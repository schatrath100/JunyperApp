/*
  # Dashboard Performance Optimization Indexes
  
  This migration creates optimized indexes for the dashboard queries to improve loading speed.
  
  ## Key Dashboard Queries Analyzed:
  1. Dashboard.tsx - KPI queries on SalesInvoice, VendorInvoice, Customer, bank_transactions
  2. RevenueChart.tsx - 6-month SalesInvoice data
  3. ExpensesChart.tsx - 6-month VendorInvoice data  
  4. RecentActivity.tsx - Count queries on multiple tables with date ranges
  
  ## Indexes Created:
  - SalesInvoice: user_id + status + date range queries
  - VendorInvoice: user_id + status + date range queries
  - Customer: user_id + created_at for new customer counts
  - bank_transactions: user_id + created_at, user_id + credit_debit_indicator
  - userDefinedAccounts: user_id + created_at for activity tracking
*/

-- =====================================================
-- SalesInvoice Table Indexes for Dashboard Performance
-- =====================================================

-- Composite index for user_id + Status + InvoiceDate (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_salesinvoice_user_status_date 
ON "SalesInvoice" (user_id, "Status", "InvoiceDate") 
WHERE "Status" != 'Cancelled';

-- Index for user_id + InvoiceDate (for date range queries without status filter)
CREATE INDEX IF NOT EXISTS idx_salesinvoice_user_date 
ON "SalesInvoice" (user_id, "InvoiceDate");

-- Index for user_id + created_at (for RecentActivity component)
CREATE INDEX IF NOT EXISTS idx_salesinvoice_user_created 
ON "SalesInvoice" (user_id, created_at);

-- =====================================================
-- VendorInvoice Table Indexes for Dashboard Performance
-- =====================================================

-- Composite index for user_id + Status + Date (bills KPI queries)
CREATE INDEX IF NOT EXISTS idx_vendorinvoice_user_status_date 
ON "VendorInvoice" (user_id, "Status", "Date") 
WHERE "Status" != 'Cancelled';

-- Index for user_id + Date (for date range queries without status filter)
CREATE INDEX IF NOT EXISTS idx_vendorinvoice_user_date 
ON "VendorInvoice" (user_id, "Date");

-- Index for user_id + created_at (for RecentActivity component)
CREATE INDEX IF NOT EXISTS idx_vendorinvoice_user_created 
ON "VendorInvoice" (user_id, created_at);

-- =====================================================
-- Customer Table Indexes for Dashboard Performance
-- =====================================================

-- Index for user_id + created_at (new customers KPI)
CREATE INDEX IF NOT EXISTS idx_customer_user_created 
ON "Customer" (user_id, created_at);

-- =====================================================
-- bank_transactions Table Indexes for Dashboard Performance
-- =====================================================

-- Index for user_id + created_at (cash balance calculations)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_created 
ON bank_transactions (user_id, created_at);

-- Index for user_id + credit_debit_indicator (cash balance calculations)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_indicator 
ON bank_transactions (user_id, credit_debit_indicator);

-- Composite index for user_id + credit_debit_indicator + created_at
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_indicator_created 
ON bank_transactions (user_id, credit_debit_indicator, created_at);

-- =====================================================
-- userDefinedAccounts Table Indexes for Dashboard Performance
-- =====================================================

-- Index for user_id + created_at (RecentActivity component)
CREATE INDEX IF NOT EXISTS idx_userdefinedaccounts_user_created 
ON "userDefinedAccounts" (user_id, created_at);

-- =====================================================
-- Transaction Table Indexes for Journals Performance
-- =====================================================

-- Index for user_id + transaction_date (Journals page)
CREATE INDEX IF NOT EXISTS idx_transaction_user_date 
ON "Transaction" (user_id, transaction_date);

-- =====================================================
-- Notifications Table Indexes (if not already created)
-- =====================================================

-- These may already exist from previous migrations, creating only if not exists
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications (user_id, read, created_at DESC);

-- =====================================================
-- Additional Performance Optimizations
-- =====================================================

-- Update table statistics to help query planner
ANALYZE "SalesInvoice";
ANALYZE "VendorInvoice"; 
ANALYZE "Customer";
ANALYZE bank_transactions;
ANALYZE "userDefinedAccounts";
ANALYZE "Transaction";
ANALYZE notifications;

-- Add comments for documentation
COMMENT ON INDEX idx_salesinvoice_user_status_date IS 'Optimizes dashboard KPI queries for sales data with status filtering';
COMMENT ON INDEX idx_vendorinvoice_user_status_date IS 'Optimizes dashboard KPI queries for bills/expenses data with status filtering';
COMMENT ON INDEX idx_customer_user_created IS 'Optimizes new customers count queries in dashboard';
COMMENT ON INDEX idx_bank_transactions_user_indicator_created IS 'Optimizes cash balance calculations in dashboard';
COMMENT ON INDEX idx_userdefinedaccounts_user_created IS 'Optimizes recent activity tracking for user accounts'; 