import React, { useState, useEffect } from 'react';
import { Save, Pencil, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/use-toast';
import { cn } from "../lib/utils";

interface Account {
  id: number;
  account_name: string;
  account_type: string;
}

interface AccountingSettings {
  id: string;
  user_id: string;
  company_legal_name: string;
  base_currency: string;
  accounting_method: string;
  time_zone: string;
  business_type: string;
  tax_id: string;
  business_address: string;
  business_phone: string;
  sales_revenue_account: string;
  purchases_account: string;
  accounts_receivable_account: string;
  accounts_payable_account: string;
  taxes_payable_account: string;
  cash_account: string;
  bank_name: string;
  branch_name: string;
  account_number: string;
  is_default_bank: boolean;
  created_at: string;
  updated_at: string;
}

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
  id: '',
  user_id: '',
  company_legal_name: '',
  base_currency: 'USD',
  accounting_method: 'Accrual',
  time_zone: 'US/Eastern',
  business_type: '',
  tax_id: '',
  business_address: '',
  business_phone: '',
  sales_revenue_account: '',
  purchases_account: '',
  accounts_receivable_account: '',
  accounts_payable_account: '',
  taxes_payable_account: '',
  cash_account: '',
  bank_name: '',
  branch_name: '',
  account_number: '',
  is_default_bank: false,
  created_at: '',
  updated_at: '',
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AccountingSettings>(DEFAULT_SETTINGS);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCard, setSavedCard] = useState<string | null>(null);
  const [accountsByType, setAccountsByType] = useState<Record<string, Account[]>>({
    Revenue: [],
    Expense: [],
    Asset: [],
    Liability: [],
    Equity: []
  });
  const { toast } = useToast();

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
      setIsLoading(false);
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
      taxes_payable_account: 'Taxes Payable Account'
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
      setIsSaving(true);
      setError(null);

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
        accounts_receivable_account: settings.accounts_receivable_account || null,
        accounts_payable_account: settings.accounts_payable_account || null,
        taxes_payable_account: settings.taxes_payable_account || null,
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
      setIsSaving(false);
    }
  };

  const handleAccountChange = (field: keyof AccountingSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value === '' ? null : Number(value)
    }));
  };

  const handleSaveCard = async (cardType: string) => {
    console.log('Starting save for card:', cardType);
    setIsSaving(true);
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user found');
      }

      const updateData: Partial<AccountingSettings> = {
        id: settings.id,
        user_id: session.user.id,
      };

      // Add only the fields for the specific card being saved
      if (cardType === 'general') {
        updateData.base_currency = settings.base_currency;
        updateData.accounting_method = settings.accounting_method;
        updateData.time_zone = settings.time_zone;
      } else if (cardType === 'business') {
        updateData.company_legal_name = settings.company_legal_name;
        updateData.business_type = settings.business_type;
        updateData.tax_id = settings.tax_id;
        updateData.business_address = settings.business_address;
        updateData.business_phone = settings.business_phone;
      } else if (cardType === 'accounts') {
        updateData.sales_revenue_account = settings.sales_revenue_account;
        updateData.purchases_account = settings.purchases_account;
        updateData.accounts_receivable_account = settings.accounts_receivable_account;
        updateData.accounts_payable_account = settings.accounts_payable_account;
        updateData.taxes_payable_account = settings.taxes_payable_account;
        updateData.cash_account = settings.cash_account;
      } else if (cardType === 'bank') {
        updateData.bank_name = settings.bank_name;
        updateData.branch_name = settings.branch_name;
        updateData.account_number = settings.account_number;
        updateData.is_default_bank = settings.is_default_bank;
      }

      console.log('Saving data:', updateData);

      const { data, error } = await supabase
        .from('accounting_settings')
        .upsert(updateData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (data) {
        console.log('Save successful, updating state');
        setSettings(prev => ({ ...prev, ...data }));
        setSavedCard(cardType);
        
        // Clear saved state and exit edit mode after delay
        setTimeout(() => {
          console.log('Clearing saved state for card:', cardType);
          setSavedCard(null);
          setEditingCard(null);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Company Settings</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* General Settings Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex justify-between items-center">
              <h2 className="text-base font-semibold text-blue-700 dark:text-blue-300">General Settings</h2>
              <div className="flex gap-2 items-center">
                {editingCard === 'general' ? (
                  <>
                    {savedCard === 'general' ? (
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">Record saved</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveCard('general')}
                        disabled={isSaving}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCard(null);
                        setSavedCard(null);
                      }}
                      className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCard('general')}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={settings.base_currency}
                    onChange={(e) => setSettings({ ...settings, base_currency: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white bg-gray-50 dark:bg-gray-700",
                      editingCard !== 'general' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'general'}
                  >
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Accounting Method
                  </label>
                  <select
                    value={settings.accounting_method}
                    onChange={(e) => setSettings({ ...settings, accounting_method: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      editingCard !== 'general' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'general'}
                  >
                    <option value="Accrual">Accrual</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time Zone
                  </label>
                  <select
                    value={settings.time_zone}
                    onChange={(e) => setSettings({ ...settings, time_zone: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      editingCard !== 'general' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'general'}
                  >
                    <option value="US/Eastern">US/Eastern</option>
                    <option value="US/Central">US/Central</option>
                    <option value="US/Mountain">US/Mountain</option>
                    <option value="US/Pacific">US/Pacific</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Business Details Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-800 flex justify-between items-center">
              <h2 className="text-base font-semibold text-green-700 dark:text-green-300">Business Details</h2>
              <div className="flex gap-2 items-center">
                {editingCard === 'business' ? (
                  <>
                    {savedCard === 'business' ? (
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">Record saved</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveCard('business')}
                        disabled={isSaving}
                        className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCard(null);
                        setSavedCard(null);
                      }}
                      className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCard('business')}
                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={settings.company_legal_name}
                    onChange={(e) => setSettings({ ...settings, company_legal_name: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      editingCard !== 'business' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'business'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Type
                  </label>
                  <select
                    value={settings.business_type}
                    onChange={(e) => setSettings({ ...settings, business_type: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      editingCard !== 'business' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'business'}
                  >
                    <option value="">Select type</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Corporation">Corporation</option>
                    <option value="LLC">LLC</option>
                    <option value="Non-Profit">Non-Profit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tax ID/VAT Number
                  </label>
                  <input
                    type="text"
                    value={settings.tax_id}
                    onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      editingCard !== 'business' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'business'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.business_phone}
                    onChange={(e) => setSettings({ ...settings, business_phone: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      editingCard !== 'business' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'business'}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Address
                  </label>
                  <input
                    type="text"
                    value={settings.business_address}
                    onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      editingCard !== 'business' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'business'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Chart of Accounts Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800 flex justify-between items-center">
              <h2 className="text-base font-semibold text-purple-700 dark:text-purple-300">Chart of Accounts</h2>
              <div className="flex gap-2 items-center">
                {editingCard === 'accounts' ? (
                  <>
                    {savedCard === 'accounts' ? (
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">Record saved</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveCard('accounts')}
                        disabled={isSaving}
                        className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCard(null);
                        setSavedCard(null);
                      }}
                      className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCard('accounts')}
                    className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sales Revenue Account
                  </label>
                  <select
                    value={settings.sales_revenue_account || ''}
                    onChange={(e) => setSettings({ ...settings, sales_revenue_account: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      !editingCard && "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    )}
                    disabled={!editingCard}
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter(account => account.account_type === 'Revenue')
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Purchases Account
                  </label>
                  <select
                    value={settings.purchases_account || ''}
                    onChange={(e) => setSettings({ ...settings, purchases_account: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      !editingCard && "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    )}
                    disabled={!editingCard}
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter(account => account.account_type === 'Expense')
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Accounts Receivable
                  </label>
                  <select
                    value={settings.accounts_receivable_account || ''}
                    onChange={(e) => setSettings({ ...settings, accounts_receivable_account: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      !editingCard && "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    )}
                    disabled={!editingCard}
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter(account => account.account_type === 'Asset')
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Accounts Payable
                  </label>
                  <select
                    value={settings.accounts_payable_account || ''}
                    onChange={(e) => setSettings({ ...settings, accounts_payable_account: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      !editingCard && "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    )}
                    disabled={!editingCard}
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter(account => account.account_type === 'Liability')
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Taxes Payable
                  </label>
                  <select
                    value={settings.taxes_payable_account || ''}
                    onChange={(e) => setSettings({ ...settings, taxes_payable_account: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      !editingCard && "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    )}
                    disabled={!editingCard}
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter(account => account.account_type === 'Liability')
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cash Account
                  </label>
                  <select
                    value={settings.cash_account || ''}
                    onChange={(e) => setSettings({ ...settings, cash_account: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      !editingCard && "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    )}
                    disabled={!editingCard}
                  >
                    <option value="">Select account</option>
                    {accounts
                      .filter(account => account.account_name.toLowerCase().includes('cash'))
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex justify-between items-center">
              <h2 className="text-base font-semibold text-amber-700 dark:text-amber-300">Bank Details</h2>
              <div className="flex gap-2 items-center">
                {editingCard === 'bank' ? (
                  <>
                    {savedCard === 'bank' ? (
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">Record saved</span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveCard('bank')}
                        disabled={isSaving}
                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingCard(null);
                        setSavedCard(null);
                      }}
                      className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCard('bank')}
                    className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={settings.bank_name}
                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      editingCard !== 'bank' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'bank'}
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
                    className={cn(
                      "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                      editingCard !== 'bank' && "bg-gray-50 dark:bg-gray-700"
                    )}
                    disabled={editingCard !== 'bank'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={settings.account_number}
                  onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
                  className={cn(
                    "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                    editingCard !== 'bank' && "bg-gray-50 dark:bg-gray-700"
                  )}
                  disabled={editingCard !== 'bank'}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default_bank"
                  checked={settings.is_default_bank}
                  onChange={(e) => setSettings({ ...settings, is_default_bank: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_default_bank" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Set as default bank account
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
