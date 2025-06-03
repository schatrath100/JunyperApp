import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, RefreshCw, X, Pencil, Wallet, TrendingUp, TrendingDown, Building2, Landmark } from 'lucide-react';
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
  const [selectedType, setSelectedType] = useState('Revenue');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { sortedItems: sortedAccounts, sortConfig, requestSort } = useTableSort(
    accounts.filter(account => account.account_type === selectedType),
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

      const { data, error } = await supabase
        .from('Account')
        .select('*')
        .order('id');

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
      account_type: account.account_type,
      account_group: account.account_group,
      account_description: account.account_description,
    });
    setEditingAccountId(account.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    if (!formData.account_name.trim()) newErrors.account_name = 'Account Name is required';
    if (!formData.account_type) newErrors.account_type = 'Account Type is required';
    if (!formData.account_group.trim()) newErrors.account_group = 'Account Group is required';
    if (!formData.account_description.trim()) newErrors.account_description = 'Description is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!user) throw new Error('You must be logged in to manage accounts');

      if (editingAccountId) {
        // Update existing account
        const { error: updateError } = await supabase
          .from('Account')
          .update(formData)
          .eq('id', editingAccountId);

        if (updateError) throw updateError;
      } else {
        // Create new account
        const { error: insertError } = await supabase
          .from('Account')
          .insert([
            {
              ...formData,
              user_id: user.id,
            },
          ]);

        if (insertError) throw insertError;
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

  const handleDelete = async () => {
    if (!editingAccountId) return;
    
    try {
      setDeleteLoading(true);
      setFormError(null);
      setError(null);

      // Get the user for verification
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('You must be logged in to delete accounts');

      // First verify the account exists and belongs to the user
      const { data: account, error: fetchError } = await supabase
        .from('Account')
        .select('user_id')
        .eq('id', editingAccountId)
        .single();

      if (fetchError) throw fetchError;
      if (!account) throw new Error('Account not found');
      if (account.user_id !== user.id) throw new Error('You can only delete your own accounts');

      const { error: deleteError } = await supabase
        .from('Account')
        .delete()
        .eq('id', editingAccountId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Reset form and close panel after successful deletion
      setIsFormOpen(false);
      setEditingAccountId(null);
      setFormData({
        account_name: '',
        account_group: '',
        account_type: '',
        account_description: '',
      });
      await fetchAccounts();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting account:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setFormError(errorMessage);
      setError(errorMessage);
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

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

      <div className="mb-8 flex space-x-3">
        {ACCOUNT_TYPE_FILTERS.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`px-5 py-2.5 rounded-md font-medium transition-all duration-200 flex items-center space-x-3 text-sm leading-5 hover:shadow-sm ${
                selectedType === type.value
                  ? type.color
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{type.value}</span>
            </button>
          );
        })}
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
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => requestSort('account_name')} className="cursor-pointer">
                    Account Name
                  </TableHead>
                  <TableHead onClick={() => requestSort('account_type')} className="cursor-pointer">
                    Account Type
                  </TableHead>
                  <TableHead onClick={() => requestSort('account_group')} className="cursor-pointer">
                    Group
                  </TableHead>
                  <TableHead onClick={() => requestSort('account_description')} className="cursor-pointer">
                    Description
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="text-sm leading-5 font-medium text-gray-900 dark:text-white">{account.account_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm leading-5 text-gray-500 dark:text-gray-400">{account.account_type || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm leading-5 text-gray-500 dark:text-gray-400">{account.account_group || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm leading-5 text-gray-500 dark:text-gray-400">{account.account_description || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleEdit(account)}
                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
                {accounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No accounts found. Click "New Account" to add one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Sliding Form Panel */}
      <div className={`fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${isFormOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
              {editingAccountId ? 'Edit Account' : 'New Account'}
            </h2>
            <button
              onClick={() => {
                setIsFormOpen(false);
                setEditingAccountId(null);
                setFormError(null);
              }}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-all duration-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6">
            {formError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-6">
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

              <div>
                <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Type *
                </label>
                <select
                  id="account_type"
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className={cn(
                    "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm leading-5 transition-shadow duration-200 hover:border-gray-400 dark:hover:border-gray-600",
                    errors.account_type && "border-red-500 focus:ring-red-500"
                  )}
                >
                  <option value="">Select account type</option>
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.account_type && (
                  <p className="mt-1 text-sm text-red-500">{errors.account_type}</p>
                )}
              </div>

              <div>
                <label htmlFor="account_group" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Group *
                </label>
                <input
                  type="text"
                  id="account_group"
                  value={formData.account_group}
                  onChange={(e) => setFormData({ ...formData, account_group: e.target.value })}
                  className={cn(
                    "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm leading-5 transition-shadow duration-200 hover:border-gray-400 dark:hover:border-gray-600",
                    errors.account_group && "border-red-500 focus:ring-red-500"
                  )}
                  placeholder="Enter account group"
                />
                {errors.account_group && (
                  <p className="mt-1 text-sm text-red-500">{errors.account_group}</p>
                )}
              </div>

              <div>
                <label htmlFor="account_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  id="account_description"
                  value={formData.account_description}
                  onChange={(e) => setFormData({ ...formData, account_description: e.target.value })}
                  rows={4}
                  className={cn(
                    "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm leading-5 transition-shadow duration-200 hover:border-gray-400 dark:hover:border-gray-600",
                    errors.account_description && "border-red-500 focus:ring-red-500"
                  )}
                  placeholder="Enter account description"
                />
                {errors.account_description && (
                  <p className="mt-1 text-sm text-red-500">{errors.account_description}</p>
                )}
              </div>
            </div>
          </form>

          <div className="px-8 py-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex space-x-3">
              {editingAccountId && (
                <Button
                  variant="primary"
                  className="flex-1 !bg-red-500 hover:!bg-red-600"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={saving || deleteLoading}
                >
                  Delete Account
                </Button>
              )}
              <Button
                variant="primary"
                className="flex-1 bg-black hover:bg-black/90 text-white"
                onClick={handleSubmit}
                disabled={saving || deleteLoading}
              >
                {saving ? 'Saving...' : (editingAccountId ? 'Save Changes' : 'Save Account')}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingAccountId(null);
                  setFormError(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
      
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
                onClick={handleDelete}
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
