import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, RefreshCw, X, Pencil, Wallet, TrendingUp, TrendingDown, Building2, Landmark, Trash2, Loader2, Save, Lock, Unlock, Search } from 'lucide-react';
import Button from '../components/Button';
import { cn } from '../lib/utils';

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'Asset', label: 'Asset' },
  { value: 'Liability', label: 'Liability' },
  { value: 'Equity', label: 'Equity' },
  { value: 'Revenue', label: 'Revenue' },
  { value: 'Expense', label: 'Expense' }
];

import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const ACCOUNT_TYPE_FILTERS = [
  { value: 'Revenue', color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400', icon: TrendingUp },
  { value: 'Expense', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400', icon: TrendingDown },
  { value: 'Asset', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400', icon: Wallet },
  { value: 'Liability', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400', icon: Building2 },
  { value: 'Equity', color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-400', icon: Landmark }
];

interface Account {
  id: number;
  account_name: string;
  account_group: string;
  account_description: string;
  account_type: string;
  user_id?: string;
  isSystemAccount?: boolean; // Add flag to distinguish system accounts
}

interface AccountFormData {
  account_name: string;
  account_group: string;
  account_description: string;
  account_type: string;
}

const ACCOUNT_TYPES = [
  'All',
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Expense'
];

const Accounts: React.FC = () => {
  const [selectedType, setSelectedType] = useState('All');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    account_name: '',
    account_group: '',
    account_description: '',
    account_type: ''
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAccounts = accounts.filter(account => {
    const matchesType = selectedType === 'All' || account.account_type.toLowerCase() === selectedType.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      account.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.account_group.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.account_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.account_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const { sortedItems: sortedAccounts, sortConfig, requestSort } = useTableSort(
    filteredAccounts,
    { key: 'created_at', direction: 'desc' }
  );

  const fetchAccounts = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to view accounts');
        return;
      }

      // Fetch user accounts from userDefinedAccounts table
      let userAccountsQuery = supabase
        .from('userDefinedAccounts')
        .select('*')
        .eq('user_id', user.id)
        .order('id');

      // Fetch system accounts from systemAccounts table
      let systemAccountsQuery = supabase
        .from('systemAccounts')
        .select('*')
        .order('id');

      const [userAccountsResult, systemAccountsResult] = await Promise.all([
        userAccountsQuery,
        systemAccountsQuery
      ]);

      if (userAccountsResult.error) {
        throw userAccountsResult.error;
      }

      if (systemAccountsResult.error) {
        throw systemAccountsResult.error;
      }

      // Mark user accounts as editable
      const userAccounts = (userAccountsResult.data || []).map(account => ({
        ...account,
        isSystemAccount: false
      }));

      // Mark system accounts as readonly
      const systemAccounts = (systemAccountsResult.data || []).map(account => ({
        ...account,
        isSystemAccount: true
      }));

      // Combine both arrays - system accounts first, then user accounts
      const allAccounts = [...systemAccounts, ...userAccounts];
      setAccounts(allAccounts);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleEdit = (account: Account) => {
    setFormData({
      account_name: account.account_name,
      account_group: account.account_group,
      account_type: account.account_type,
      account_description: account.account_description,
    });
    setEditingAccountId(account.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    setErrors({});

    // Validate all required fields
    const newErrors: { [key: string]: string } = {};
    if (!formData.account_name.trim()) {
      newErrors.account_name = 'Account name is required';
    }
    if (!formData.account_type) {
      newErrors.account_type = 'Account type is required';
    }
    if (!formData.account_group.trim()) {
      newErrors.account_group = 'Account group is required';
    }
    if (!formData.account_description.trim()) {
      newErrors.account_description = 'Description is required';
    }

    // If there are validation errors, show them and stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSaving(false);
      return;
    }

    try {
      console.log('Starting account save process...');
      console.log('Form data:', formData);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }
      if (!user) {
        console.error('No user found');
        throw new Error('You must be logged in to manage accounts');
      }

      console.log('User authenticated:', user.id);

      const accountData = {
        account_name: formData.account_name.trim(),
        account_group: formData.account_group.trim(),
        account_type: formData.account_type,
        account_description: formData.account_description.trim(),
        user_id: user.id
      };

      console.log('Account data to save:', accountData);

      if (editingAccountId) {
        console.log('Updating existing account with ID:', editingAccountId);
        const { error: updateError } = await supabase
          .from('userDefinedAccounts')
          .update(accountData)
          .eq('id', editingAccountId)
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        console.log('Account updated successfully');
      } else {
        console.log('Creating new account');
        const { error: insertError } = await supabase
          .from('userDefinedAccounts')
          .insert([accountData]);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        console.log('Account created successfully');
      }

      // Reset form and close
      setFormData({
        account_name: '',
        account_group: '',
        account_description: '',
        account_type: '',
      });
      setEditingAccountId(null);
      setIsFormOpen(false);
      setErrors({});
      
      // Refresh accounts list
      await fetchAccounts();
    } catch (err) {
      console.error('Error saving account:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accountId: number) => {
    try {
      setDeleteLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to delete accounts');
      }

      const { error: deleteError } = await supabase
        .from('userDefinedAccounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setShowDeleteConfirm(false);
      await fetchAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const getTabStyle = (type: string) => {
    const colorSchemes = {
      all: {
        gradient: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        hover: 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)',
        active: 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)',
        text: '#1F2937',
      },
      asset: {
        gradient: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
        hover: 'linear-gradient(135deg, #BAE6FD 0%, #7DD3FC 100%)',
        active: 'linear-gradient(135deg, #7DD3FC 0%, #38BDF8 100%)',
        text: '#0369A1',
      },
      liability: {
        gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        hover: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)',
        active: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
        text: '#D97706',
      },
      equity: {
        gradient: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
        hover: 'linear-gradient(135deg, #E9D5FF 0%, #C4B5FD 100%)',
        active: 'linear-gradient(135deg, #C4B5FD 0%, #8B5CF6 100%)',
        text: '#7C3AED',
      },
      revenue: {
        gradient: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
        hover: 'linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)',
        active: 'linear-gradient(135deg, #86EFAC 0%, #4ADE80 100%)',
        text: '#15803D',
      },
      expense: {
        gradient: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
        hover: 'linear-gradient(135deg, #FECACA 0%, #FCA5A5 100%)',
        active: 'linear-gradient(135deg, #FCA5A5 0%, #F87171 100%)',
        text: '#B91C1C',
      },
    };

    const scheme = colorSchemes[type.toLowerCase() as keyof typeof colorSchemes] || colorSchemes.asset;

    return {
      padding: '0.75rem 1.5rem',
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: selectedType === type ? 600 : 500,
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
      border: 'none',
      outline: 'none',
      background: selectedType === type ? scheme.active : scheme.gradient,
      color: selectedType === type ? scheme.text : '#4B5563',
      '&:hover': {
        background: scheme.hover,
        color: scheme.text,
      },
    };
  };

  return (
    <div className="p-6">
      {/* Enhanced Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
          <button
            onClick={fetchAccounts}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
            disabled={loading || refreshing}
            title="Refresh accounts"
          >
            <RefreshCw className={`w-5 h-5 ${loading || refreshing ? 'animate-spin' : ''}`} />
          </button>
          {sortedAccounts.length > 0 && (
            <div className="hidden sm:flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              {sortedAccounts.length} account{sortedAccounts.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            />
            {(loading || refreshing) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5 h-11 px-6"
            onClick={() => {
              setFormData({
                account_name: '',
                account_group: '',
                account_description: '',
                account_type: '',
              });
              setEditingAccountId(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Account
          </Button>
        </div>
      </div>

      {/* Enhanced Tab Filters */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {ACCOUNT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            style={getTabStyle(type)}
            className={`capitalize whitespace-nowrap ${
              selectedType === type ? 'shadow-md' : ''
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Enhanced Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                <TableHead 
                  onClick={() => requestSort('account_name')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-64 text-left font-semibold"
                >
                  <div className="flex items-center space-x-2">
                    <span>Account Name</span>
                    {sortConfig?.key === 'account_name' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('account_type')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-32 text-center font-semibold"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Type</span>
                    {sortConfig?.key === 'account_type' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('account_group')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-40 text-left font-semibold"
                >
                  <div className="flex items-center space-x-2">
                    <span>Group</span>
                    {sortConfig?.key === 'account_group' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('account_description')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-64 text-left font-semibold"
                >
                  <div className="flex items-center space-x-2">
                    <span>Description</span>
                    {sortConfig?.key === 'account_description' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-24 text-center font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                      <p className="text-gray-500 dark:text-gray-400">Loading accounts...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-gray-900 dark:text-gray-100 font-medium">No accounts found</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                          {searchQuery ? 'Try adjusting your search terms' : 'Get started by creating your first account'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedAccounts.map((account) => (
                  <TableRow 
                    key={`${account.isSystemAccount ? 'system' : 'user'}-${account.id}`} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100 w-64">
                      <div className="flex items-center space-x-3">
                        {account.isSystemAccount ? (
                          <div title="System Account (Read-only)" className="flex-shrink-0">
                            <Lock className="w-4 h-4 text-red-500 dark:text-red-400" strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div title="User Account (Editable)" className="flex-shrink-0">
                            <Unlock className="w-4 h-4 text-green-500 dark:text-green-400" strokeWidth={2.5} />
                          </div>
                        )}
                        <div className="truncate" title={account.account_name}>
                          {account.account_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-32 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.account_type === 'Asset' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400' :
                        account.account_type === 'Liability' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400' :
                        account.account_type === 'Equity' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-400' :
                        account.account_type === 'Revenue' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400' :
                        account.account_type === 'Expense' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400' :
                        'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-400'
                      }`}>
                        {account.account_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300 w-40">
                      <div className="truncate" title={account.account_group}>
                        {account.account_group}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300 w-64">
                      <div className="truncate" title={account.account_description}>
                        {account.account_description}
                      </div>
                    </TableCell>
                    <TableCell className="w-24">
                      <div className="flex items-center justify-center">
                        {!account.isSystemAccount && (
                          <button
                            onClick={() => handleEdit(account)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                            title="Edit account"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Enhanced Sliding Form Panel */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 transition-all duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsFormOpen(false);
              setEditingAccountId(null);
              setFormData({
                account_name: '',
                account_group: '',
                account_type: '',
                account_description: '',
              });
            }
          }}
        >
          <div 
            className={`fixed inset-y-0 right-0 w-[500px] bg-white dark:bg-gray-900 shadow-[0_0_50px_rgba(0,0,0,0.2)] transform transition-all duration-300 ease-in-out ${
              isFormOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Enhanced Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {editingAccountId ? 'Edit Account' : 'New Account'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {editingAccountId ? 'Update account information' : 'Create a new account for your chart of accounts'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingAccountId(null);
                    setFormData({
                      account_name: '',
                      account_group: '',
                      account_type: '',
                      account_description: '',
                    });
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Enhanced Form Content */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="account_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="account_name"
                      value={formData.account_name}
                      onChange={(e) => {
                        setFormData({ ...formData, account_name: e.target.value });
                        if (errors.account_name) {
                          setErrors(prev => ({ ...prev, account_name: '' }));
                        }
                      }}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200",
                        errors.account_name && "border-red-500 focus:ring-red-500"
                      )}
                      placeholder="Enter account name"
                      required
                    />
                    {errors.account_name && (
                      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.account_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="account_type"
                      value={formData.account_type}
                      onChange={(e) => {
                        setFormData({ ...formData, account_type: e.target.value });
                        if (errors.account_type) {
                          setErrors(prev => ({ ...prev, account_type: '' }));
                        }
                      }}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200",
                        errors.account_type && "border-red-500 focus:ring-red-500"
                      )}
                      required
                    >
                      <option value="">Select account type</option>
                      {ACCOUNT_TYPE_OPTIONS.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {errors.account_type && (
                      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.account_type}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="account_group" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account Group <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="account_group"
                      value={formData.account_group}
                      onChange={(e) => {
                        setFormData({ ...formData, account_group: e.target.value });
                        if (errors.account_group) {
                          setErrors(prev => ({ ...prev, account_group: '' }));
                        }
                      }}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200",
                        errors.account_group && "border-red-500 focus:ring-red-500"
                      )}
                      placeholder="Enter account group"
                      required
                    />
                    {errors.account_group && (
                      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.account_group}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="account_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="account_description"
                      value={formData.account_description}
                      onChange={(e) => {
                        setFormData({ ...formData, account_description: e.target.value });
                        if (errors.account_description) {
                          setErrors(prev => ({ ...prev, account_description: '' }));
                        }
                      }}
                      rows={4}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none",
                        errors.account_description && "border-red-500 focus:ring-red-500"
                      )}
                      placeholder="Enter account description"
                      required
                    />
                    {errors.account_description && (
                      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.account_description}
                      </p>
                    )}
                  </div>
                </div>

                {formError && (
                  <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formError}
                  </div>
                )}

                {/* Enhanced Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingAccountId(null);
                      setFormData({
                        account_name: '',
                        account_group: '',
                        account_type: '',
                        account_description: '',
                      });
                      setErrors({});
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium py-3 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={saving || deleteLoading}
                  >
                    {saving ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Account</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Account</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(editingAccountId as number)}
                disabled={deleteLoading}
                className="flex-1 !bg-red-600 hover:!bg-red-700"
                variant="default"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
