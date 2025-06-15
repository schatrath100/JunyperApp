import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';

interface BankTransactionAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlert?: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
  onSave: () => void;
}

const BankTransactionAddModal: React.FC<BankTransactionAddModalProps> = ({
  isOpen,
  onClose,
  onAlert,
  onSave
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    bank_name: '',
    description: '',
    deposit: '',
    withdrawal: '',
    account_number: '',
    type: 'deposit' as 'deposit' | 'withdrawal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate and prepare the data
      const depositAmount = formData.type === 'deposit' ? parseFloat(formData.deposit) : 0;
      const withdrawalAmount = formData.type === 'withdrawal' ? parseFloat(formData.withdrawal) : 0;
      const accountNumber = parseInt(formData.account_number);

      if (isNaN(depositAmount) || isNaN(withdrawalAmount) || isNaN(accountNumber)) {
        throw new Error('Invalid number format in amount or account number');
      }

      if (depositAmount < 0 || withdrawalAmount < 0) {
        throw new Error('Amounts cannot be negative');
      }

      // Parse the date and create UTC date
      const parsedDate = new Date(formData.date);
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth();
      const day = parsedDate.getDate();
      
      // Create a new date at midnight UTC
      const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

      const transactionData = {
        date: utcDate.toISOString(), // This will be in UTC
        bank_name: formData.bank_name.trim(),
        description: formData.description.trim(),
        deposit: depositAmount,
        withdrawal: withdrawalAmount,
        account_number: accountNumber,
        user_id: user.id,
        transaction_source: 'manual'
      };

      console.log('Attempting to insert transaction:', transactionData);

      const { error: insertError } = await supabase
        .from('bank_transactions')
        .insert(transactionData);

      if (insertError) throw insertError;

      onAlert?.('Transaction added successfully', 'success');
      onSave?.();
      onClose();
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Bank Transaction
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Number
                </label>
                <input
                  type="number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'deposit' | 'withdrawal' })}
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                  required
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>

              {formData.type === 'deposit' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deposit Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Withdrawal Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.withdrawal}
                    onChange={(e) => setFormData({ ...formData, withdrawal: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-sm"
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BankTransactionAddModal;
