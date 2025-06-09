import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, RefreshCw, X, Pencil, Wallet, TrendingUp, TrendingDown, Building2, Landmark, Trash2 } from 'lucide-react';
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
  user_id: string;
}

interface AccountFormData {
  account_name: string;
  account_group: string;
  account_description: string;
  account_type: string;
}

const ACCOUNT_TYPES = [
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'Expense'
];

const Accounts: React.FC = () => {
  const [selectedType, setSelectedType] = useState('Revenue');
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

  const { sortedItems: sortedAccounts, sortConfig, requestSort } = useTableSort(
    accounts.filter(account => account.account_type.toLowerCase() === selectedType.toLowerCase()),
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

      // First, let's fetch all accounts to see what we have
      const { data: allData, error: allError } = await supabase
        .from('Account')
        .select('*');

      console.log('All accounts:', allData);
      console.log('Selected type:', selectedType);
      console.log('Capitalized type:', selectedType.charAt(0).toUpperCase() + selectedType.slice(1));

      const { data, error } = await supabase
        .from('Account')
        .select('*')
        .eq('account_type', selectedType.charAt(0).toUpperCase() + selectedType.slice(1))
        .order('id');

      console.log('Filtered accounts:', data);

      if (error) {
        throw error;
      }

      setAccounts(data || []);
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
    setFormError(null);
    setErrors({});
    
    // Only validate description field
    const newErrors: Record<string, string> = {};
    if (!formData.account_description.trim()) newErrors.account_description = 'Description is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setFormError('Please provide a description');
      return;
    }

    try {
      setSaving(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!user) throw new Error('You must be logged in to manage accounts');

      if (editingAccountId) {
        // Update only the description field
        const { error: updateError } = await supabase
          .from('Account')
          .update({ account_description: formData.account_description })
          .eq('id', editingAccountId);

        if (updateError) throw updateError;
      }

      // Reset form and close panel
      setFormData({
        account_name: '',
        account_group: '',
        account_type: '',
        account_description: '',
      });
      setEditingAccountId(null);
      setIsFormOpen(false);
      fetchAccounts();
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
      const { error } = await supabase
        .from('Account')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      await fetchAccounts();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [selectedType]);

  const getTabStyle = (type: string) => {
    const colorSchemes = {
      asset: {
        gradient: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
        hover: 'linear-gradient(135deg, #BAE6FD 0%, #7DD3FC 100%)',
        active: 'linear-gradient(135deg, #7DD3FC 0%, #38BDF8 100%)',
        text: '#0369A1',
      },
      liability: {
        gradient: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
        hover: 'linear-gradient(135deg, #FECACA 0%, #FCA5A5 100%)',
        active: 'linear-gradient(135deg, #FCA5A5 0%, #F87171 100%)',
        text: '#B91C1C',
      },
      equity: {
        gradient: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
        hover: 'linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)',
        active: 'linear-gradient(135deg, #86EFAC 0%, #4ADE80 100%)',
        text: '#15803D',
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

    const scheme = colorSchemes[type as keyof typeof colorSchemes] || colorSchemes.asset;

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
    <div className="p-8 font-inter">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Accounts</h1>
          <button
            onClick={fetchAccounts}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            disabled={loading || showDeleteConfirm}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <Button 
          icon={<Plus className="w-4 h-4" />}
          variant="default"
          className="bg-black hover:bg-black/90 text-white"
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
          New Account
        </Button>
      </div>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {['revenue', 'expense', 'equity', 'asset', 'liability'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            style={getTabStyle(type)}
            className={`capitalize ${
              selectedType === type ? 'shadow-md' : ''
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div> 
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b-4 border-gray-200 dark:border-gray-600">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Group
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No accounts found
                    </td>
                  </tr>
                ) : (
                  sortedAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {account.account_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {account.account_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {account.account_group}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {account.account_description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(account)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sliding Form Panel */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingAccountId ? 'Edit Account Description' : 'New Account'}
              </h2>
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
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {editingAccountId ? (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={formData.account_name}
                      disabled
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Account Type
                    </label>
                    <input
                      type="text"
                      value={formData.account_type}
                      disabled
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Account Group
                    </label>
                    <input
                      type="text"
                      value={formData.account_group}
                      disabled
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="account_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    id="account_name"
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    className={cn(
                      "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm leading-5 transition-shadow duration-200 hover:border-gray-400 dark:hover:border-gray-600",
                      errors.account_name && "border-red-500 focus:ring-red-500"
                    )}
                    placeholder="Enter account name"
                  />
                  {errors.account_name && (
                    <p className="mt-1 text-sm text-red-500">{errors.account_name}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description {!editingAccountId && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={formData.account_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_description: e.target.value }))}
                  className={cn(
                    "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500",
                    errors.account_description
                      ? "border-red-500 dark:border-red-500"
                      : "border-gray-300 dark:border-gray-700",
                    "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  )}
                  rows={3}
                  placeholder="Enter account description"
                />
                {errors.account_description && (
                  <p className="text-sm text-red-500">{errors.account_description}</p>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-md text-red-700 dark:text-red-400">
                  {formError}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                {editingAccountId && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    disabled={saving || deleteLoading}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={saving || deleteLoading}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 !bg-red-500 hover:!bg-red-600"
                onClick={() => handleDelete(editingAccountId as number)}
                disabled={deleteLoading}
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
