import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Trash2, Pencil, Upload, PlusCircle } from 'lucide-react';
import Button from '../components/Button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../components/ui/table';
import FilterableTableHead from '../components/FilterableTableHead';
import BankTransactionUploadModal from '../components/BankTransactionUploadModal';
import BankTransactionEditModal from '../components/BankTransactionEditModal';
import BankTransactionAddModal from '../components/BankTransactionAddModal';

interface BankTransaction {
  id: string;
  date: string;
  bank_name: string;
  description: string;
  amount: number;
  account_number: number;
  credit_debit_indicator: 'credit' | 'debit';
}

interface FilterState {
  dateFrom: string;
  bankName: string;
  description: string;
  amountMin: string;
  accountNumber: string;
  type: string;
}

const BankTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    bankName: '',
    description: '',
    amountMin: '',
    accountNumber: '',
    type: ''
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('bank_transactions')
        .select('*');

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters.bankName) {
        query = query.ilike('bank_name', `%${filters.bankName}%`);
      }
      if (filters.description) {
        query = query.ilike('description', `%${filters.description}%`);
      }
      if (filters.amountMin) {
        query = query.gte('amount', parseFloat(filters.amountMin));
      }
      if (filters.accountNumber) {
        query = query.eq('account_number', filters.accountNumber);
      }
      if (filters.type) {
        query = query.eq('credit_debit_indicator', filters.type);
      }

      // Add order by
      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEdit = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!selectedTransaction?.id) return;

    try {
      setDeleteLoading(true);
      setError(null);

      // Delete the transaction
      const { data, error: deleteError } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', selectedTransaction.id)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (deleteError) throw deleteError;

      // Refresh the transactions list
      await fetchTransactions();
      setShowDeleteConfirm(false);
      setSelectedTransaction(null);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Transactions</h1>
          <button
            onClick={fetchTransactions}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Add transaction"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {transactions.length} transactions
          </span>
          <Button
            variant="default"
            className="bg-black hover:bg-black/90 text-white"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setShowUploadModal(true)}
          >
            Upload Transactions
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <FilterableTableHead
                label="Date"
                filterKey="dateFrom"
                filterValue={filters.dateFrom}
                filterType="date"
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Bank Name"
                filterKey="bankName"
                filterValue={filters.bankName}
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Description"
                filterKey="description"
                filterValue={filters.description}
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Amount"
                filterKey="amountMin"
                filterValue={filters.amountMin}
                filterType="number"
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Account Number"
                filterKey="accountNumber"
                filterValue={filters.accountNumber}
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Type"
                filterKey="type"
                filterValue={filters.type}
                filterType="select"
                selectOptions={[
                  { value: 'credit', label: 'Credit' },
                  { value: 'debit', label: 'Debit' }
                ]}
                onFilterChange={handleFilterChange}
              />
              <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </span>
              </th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                <TableCell>{transaction.bank_name}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>
                  <span className={transaction.credit_debit_indicator === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(transaction.amount)}
                  </span>
                </TableCell>
                <TableCell>{transaction.account_number}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.credit_debit_indicator === 'credit'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {transaction.credit_debit_indicator}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(transaction)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Edit transaction"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setShowDeleteConfirm(true);
                      }}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <BankTransactionUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={fetchTransactions}
      />
      
      <BankTransactionEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onSave={fetchTransactions}
      />
      
      <BankTransactionAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={fetchTransactions}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedTransaction(null);
                }}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="!bg-red-500 hover:!bg-red-600"
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

export default BankTransactions;

export default BankTransactions