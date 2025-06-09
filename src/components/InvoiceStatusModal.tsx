import React, { useState } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface InvoiceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: number;
    InvoiceDate: string;
    Customer_name: string;
    Description?: string;
    InvoiceAmount?: number;
    Status: string;
    OutstandingAmount?: number;
  };
  onSave: () => void;
  onAlert?: (message: string, type: Alert['type']) => void;
}

const INVOICE_STATUS = [
  'Pending',
  'Paid',
  'Cancelled'
];

const InvoiceStatusModal: React.FC<InvoiceStatusModalProps> = ({ isOpen, onClose, invoice, onSave, onAlert }) => {
  const [status, setStatus] = useState(invoice.Status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user found');
      }

      // Get account IDs from accounting settings
      const { data: settings, error: settingsError } = await supabase
        .from('accounting_settings')
        .select('accounts_receivable_account, sales_revenue_account, cash_account')
        .eq('user_id', session.user.id)
        .single();

      if (settingsError) throw new Error('Failed to fetch accounting settings');
      if (!settings) throw new Error('Accounting settings not found');

      // Update invoice status
      const { error: updateError } = await supabase
        .from('SalesInvoice')
        .update({ Status: status })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // If changing from Pending to Paid, create new transactions
      if (invoice.Status === 'Pending' && status === 'Paid') {
        const amount = invoice.InvoiceAmount || 0;
        
        // Create new transactions for payment
        const transactions = [
          {
            transaction_date: new Date().toISOString(),
            account_id: settings.accounts_receivable_account,
            debit_amount: 0,
            credit_amount: amount,
            description: `Payment received for Invoice #${invoice.id} - ${invoice.Customer_name}`,
            invoice_id: invoice.id,
            bill_id: 0,
            row_num: 1,
            Status: status,
            user_id: session.user.id
          },
          {
            transaction_date: new Date().toISOString(),
            account_id: settings.cash_account,
            debit_amount: amount,
            credit_amount: 0,
            description: `Payment received for Invoice #${invoice.id} - ${invoice.Customer_name}`,
            invoice_id: invoice.id,
            bill_id: 0,
            row_num: 2,
            Status: status,
            user_id: session.user.id
          }
        ];

        const { error: transactionError } = await supabase
          .from('Transaction')
          .insert(transactions);

        if (transactionError) throw transactionError;
      }

      onSave();
      onAlert?.(`Invoice status updated to ${status}`, 'success');
      onClose();
    } catch (err) {
      console.error('Error updating invoice status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const isPaid = invoice.Status === 'Paid';
  const isPending = invoice.Status === 'Pending';
  const isCancelled = invoice.Status === 'Cancelled';
  const isProtected = isPaid || isCancelled;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Invoice #{invoice.id} Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 h-[calc(100vh-160px)] overflow-y-auto space-y-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Invoice Date
            </label>
            <input
              type="text"
              value={new Date(invoice.InvoiceDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer
            </label>
            <input
              type="text"
              value={invoice.Customer_name}
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={invoice.Description || ''}
              disabled
              rows={3}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Invoice Amount
            </label>
            <input
              type="text"
              value={invoice.InvoiceAmount 
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.InvoiceAmount)
                : '-'
              }
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Outstanding Amount
            </label>
            <input
              type="text"
              value={invoice.OutstandingAmount
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.OutstandingAmount)
                : '-'
              }
              disabled
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isProtected}
              className={cn(
                "w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white",
                isProtected && "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              )}
            >
              {INVOICE_STATUS.map((s) => (
                <option 
                  key={s} 
                  value={s}
                  disabled={isPending && s === 'Pending'}
                >
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-black hover:bg-black/90 text-white"
              onClick={handleSave}
              disabled={saving || isProtected}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceStatusModal;