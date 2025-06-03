import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';

interface Account {
  id: number;
  account_name: string;
  account_type: string;
}

interface AccountingSettings {
  id: string | null;
  base_currency: string;
  accounting_method: string;
  time_zone: string;
  company_legal_name: string;
  sales_revenue_account: number | null;
  purchases_account: number | null;
  discounts_account: number | null;
  accounts_receivable_account: number | null;
  accounts_payable_account: number | null;
  taxes_payable_account: number | null;
  retained_earnings_account: number | null;
  bank_name: string;
  branch_name: string;
  account_number: string;
  is_default_bank: boolean;
}

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

const ACCOUNTING_METHODS = [
  { value: 'Cash', label: 'Cash Basis' },
  { value: 'Accrual', label: 'Accrual Basis' },
];

const TIME_ZONES = [
  { value: 'US/Eastern', label: 'US Eastern Time' },
  { value: 'US/Central', label: 'US Central Time' },
  { value: 'US/Mountain', label: 'US Mountain Time' },
  { value: 'US/Pacific', label: 'US Pacific Time' },
  { value: 'Canada/Eastern', label: 'Canada Eastern Time' },
  { value: 'Canada/Central', label: 'Canada Central Time' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
];

const DEFAULT_SETTINGS: AccountingSettings = {
  id: null,
  base_currency: 'USD',
  company_legal_name: '',
  accounting_method: 'Accrual',
  time_zone: 'US/Eastern',
  sales_revenue_account: null,
  purchases_account: null,
  discounts_account: null,
  accounts_receivable_account: null,
  accounts_payable_account: null,
  taxes_payable_account: null,
  retained_earnings_account: null,
  bank_name: '',
  branch_name: '',
  account_number: '',
  is_default_bank: false,
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AccountingSettings>(DEFAULT_SETTINGS);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accountsByType, setAccountsByType] = useState<Record<string, Account[]>>({
    Revenue: [],
    Expense: [],
    Asset: [],
    Liability: [],
    Equity: []
  });

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  const fetchDataWithRetry = async (retryCount = 0): Promise<void> => {
    try {
      setError(null);

      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to access settings');
      }

      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('Account')
        .select('id, account_name, account_type')
        .order('account_name');

      if (accountsError) throw accountsError;

      if (accountsData) {
        setAccounts(accountsData);

        // Group accounts by type
        const grouped = accountsData.reduce((acc, account) => {
          if (!acc[account.account_type]) {
            acc[account.account_type] = [];
          }
          acc[account.account_type].push(account);
          return acc;
        }, {} as Record<string, Account[]>);

        setAccountsByType(grouped);
      }

      // Fetch user's settings
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data: settingsData, error: settingsError } = await supabase
        .from('accounting_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (settingsData) {
        setSettings(settingsData);
      } else {
        // If no settings exist, keep the default settings with null id
        setSettings({ ...DEFAULT_SETTINGS });
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      
      // If we haven't exceeded max retries and it's a network error, retry
      if (retryCount < MAX_RETRIES && err instanceof Error && err.message.includes('fetch')) {
        console.log(`Retrying fetch attempt ${retryCount + 1} of ${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchDataWithRetry(retryCount + 1);
      }

      // If it's an authentication error, redirect to login
      if (err instanceof Error && (
        err.message.includes('auth') || 
        err.message.includes('sign in') ||
        err.message.includes('authenticated')
      )) {
        navigate('/auth');
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataWithRetry();
  }, [navigate]);

  const validateAccounts = () => {
    const errors: string[] = [];

    // Required account fields with their display names
    const requiredFields = {
      sales_revenue_account: 'Sales Revenue Account',
      purchases_account: 'Purchases Account', 
      accounts_receivable_account: 'Accounts Receivable Account',
      accounts_payable_account: 'Accounts Payable Account',
      taxes_payable_account: 'Taxes Payable Account',
      retained_earnings_account: 'Retained Earnings Account'
    };

    // Check each required field
    for (const [field, displayName] of Object.entries(requiredFields)) {
      if (!settings[field]) {
        errors.push(`${displayName} is required`);
      } else if (!accounts.some(acc => acc.id === settings[field])) {
        errors.push(`Selected ${displayName} is invalid or no longer exists`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Check authentication first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Validate accounts before saving
      validateAccounts();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const settingsToSave = {
        ...settings,
        user_id: user.id,
        // Convert empty string selections to null
        sales_revenue_account: settings.sales_revenue_account || null,
        purchases_account: settings.purchases_account || null,
        discounts_account: settings.discounts_account || null,
        accounts_receivable_account: settings.accounts_receivable_account || null,
        accounts_payable_account: settings.accounts_payable_account || null,
        taxes_payable_account: settings.taxes_payable_account || null,
        retained_earnings_account: settings.retained_earnings_account || null,
      };

      // Remove the id field if it's null (for new records)
      if (!settingsToSave.id) {
        delete settingsToSave.id;
      }

      let data;
      if (settings.id) {
        // Update existing settings
        const { data: updateData, error: updateError } = await supabase
          .from('accounting_settings')
          .update(settingsToSave)
          .eq('id', settings.id)
          .select()
          .single();

        if (updateError) throw updateError;
        data = updateData;
      } else {
        // Insert new settings
        const { data: insertData, error: insertError } = await supabase
          .from('accounting_settings')
          .insert([settingsToSave])
          .select()
          .single();

        if (insertError) throw insertError;
        data = insertData;
      }

      setSettings(data);
      setSuccess('Settings saved successfully');
    } catch (err) {
      console.error('Error saving settings:', err);
      
      // If it's an authentication error, redirect to login
      if (err instanceof Error && (
        err.message.includes('auth') || 
        err.message.includes('sign in') ||
        err.message.includes('authenticated')
      )) {
        navigate('/auth');
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAccountChange = (field: keyof AccountingSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value === '' ? null : Number(value)
    }));
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Accounting Settings */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">General Accounting Settings</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Legal Name
                  </label>
                  <input
                    type="text"
                    value={settings.company_legal_name}
                    onChange={(e) => setSettings({ ...settings, company_legal_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Base Currency
                  </label>
                  <select
                    value={settings.base_currency}
                    onChange={(e) => setSettings({ ...settings, base_currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time Zone
                  </label>
                  <select
                    value={settings.time_zone}
                    onChange={(e) => setSettings({ ...settings, time_zone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    {TIME_ZONES.map((zone) => (
                      <option key={zone.value} value={zone.value}>
                        {zone.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Accounting Method
                  </label>
                  <select
                    value={settings.accounting_method}
                    onChange={(e) => setSettings({ ...settings, accounting_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    {ACCOUNTING_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Chart of Accounts */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chart of Accounts</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sales Revenue Account *
                  </label>
                  <select
                    value={settings.sales_revenue_account || ''}
                    onChange={(e) => handleAccountChange('sales_revenue_account', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select account</option>
                    {accountsByType['Revenue']?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Purchases Account *
                  </label>
                  <select
                    value={settings.purchases_account || ''}
                    onChange={(e) => handleAccountChange('purchases_account', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select account</option>
                    {accountsByType['Expense']?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Accounts Receivable *
                  </label>
                  <select
                    value={settings.accounts_receivable_account || ''}
                    onChange={(e) => handleAccountChange('accounts_receivable_account', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select account</option>
                    {accountsByType['Asset']?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Accounts Payable *
                  </label>
                  <select
                    value={settings.accounts_payable_account || ''}
                    onChange={(e) => handleAccountChange('accounts_payable_account', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select account</option>
                    {accountsByType['Liability']?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Default Bank Account */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Default Bank Account</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={settings.bank_name}
                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter bank name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={settings.branch_name}
                    onChange={(e) => setSettings({ ...settings, branch_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter branch name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={settings.account_number}
                    onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Enter account number"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.is_default_bank}
                      onChange={(e) => setSettings({ ...settings, is_default_bank: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Default Bank Account
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Accounts */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Accounts</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Taxes Payable *
                  </label>
                  <select
                    value={settings.taxes_payable_account || ''}
                    onChange={(e) => handleAccountChange('taxes_payable_account', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select account</option>
                    {accountsByType['Liability']?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Retained Earnings *
                  </label>
                  <select
                    value={settings.retained_earnings_account || ''}
                    onChange={(e) => handleAccountChange('retained_earnings_account', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select account</option>
                    {accountsByType['Equity']?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              className="w-24"
              onClick={() => navigate('/dashboard')}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-32 bg-black hover:bg-black/90 text-white"
              icon={<Save className="w-4 h-4" />}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
