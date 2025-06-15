-- =======================================================================
-- DASHBOARD PERFORMANCE OPTIMIZATION INDEXES (CORRECTED VERSION)
-- Run this script in your Supabase SQL Editor to improve dashboard speed
-- =======================================================================

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

-- Index for user_id + created_at (for dashboard date range calculations)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_created 
ON bank_transactions (user_id, created_at);

-- Index for user_id + date (for transaction date filtering)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_date 
ON bank_transactions (user_id, date);

-- Index for user_id + deposit (for deposit calculations)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_deposit 
ON bank_transactions (user_id, deposit) WHERE deposit > 0;

-- Index for user_id + withdrawal (for withdrawal calculations)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_withdrawal 
ON bank_transactions (user_id, withdrawal) WHERE withdrawal > 0;

-- Composite index for user_id + deleted flag (since soft delete is used)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_active 
ON bank_transactions (user_id, deleted, created_at) WHERE deleted = false;

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
COMMENT ON INDEX idx_bank_transactions_user_active IS 'Optimizes cash balance calculations in dashboard with soft delete support';
COMMENT ON INDEX idx_userdefinedaccounts_user_created IS 'Optimizes recent activity tracking for user accounts';

-- =======================================================================
-- INDEX CREATION COMPLETE
-- Your dashboard queries should now be significantly faster!
-- ======================================================================= 