# Fix Chart of Accounts Constraint Violations

You're getting a constraint violation error (code 23514) when saving Chart of Accounts. This is because of invalid account references in the database. Here's how to fix it:

## Step 1: Remove Unused Column (Run This First)

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `supabase/migrations/20241222000012_remove_discounts_account_column.sql`
4. Click **Run** to remove the unused discounts_account column

## Step 2: Fix Invalid Account References

1. In the same SQL Editor
2. Copy and paste the entire contents of `supabase/migrations/20241222000011_fix_retained_earnings_constraint.sql`
3. Click **Run** to clean up any invalid account references

## Step 3: Complete Constraint Fix (If Needed)

1. In the same SQL Editor
2. Copy and paste the entire contents of `supabase/migrations/20241222000010_complete_accounting_settings_fix.sql`
3. Click **Run** to execute the comprehensive migration
4. The migration will provide detailed output showing what was fixed

## Option 2: Run Migration via Node.js Script

1. Install the Supabase client if not already installed:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Get your service role key from Supabase dashboard:
   - Go to **Settings** → **API**
   - Copy the `service_role` key (NOT the anon key)

3. Set environment variables or update the script:
   ```bash
   export VITE_SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

4. Run the migration:
   ```bash
   node run-migration.js
   ```

## What This Migration Does

The migration will:

1. ✅ **Remove all problematic foreign key constraints** from `accounting_settings` table
2. ✅ **Create/update the `check_account_exists()` function** to work with both account tables
3. ✅ **Add proper check constraints** for all Chart of Accounts fields
4. ✅ **Support both `userDefinedAccounts` and `systemAccounts`** tables
5. ✅ **Provide comprehensive verification** and detailed reporting
6. ✅ **Test the constraints** to ensure they work properly

## Expected Output

When successful, you should see:
```
============================================
SUCCESS: Migration completed successfully!
Chart of Accounts should now work properly.
============================================
```

## After Running the Migration

1. The enhanced error logging in the Settings page will now provide better error messages
2. Chart of Accounts should save without the 400 error
3. You can reference accounts from both system accounts and user-defined accounts
4. All constraint violations will show helpful error messages

## Troubleshooting

If you still get errors after running the migration:

1. **Check the browser console** - the enhanced error logging will show detailed information
2. **Verify account IDs** - make sure all selected accounts actually exist in the database
3. **Check for null values** - ensure all required Chart of Accounts fields are selected

The migration is **idempotent** (safe to run multiple times) so you can re-run it if needed. 