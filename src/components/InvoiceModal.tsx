import React, { useState, useEffect } from 'react';
import { X, Calendar, Loader2, Save, AlertCircle } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';

interface Customer {
  Customer_name: string;
}

interface SaleItem {
  Item_Name: string;
}

interface InvoiceFormData {
  customerName: string;
  customerEmail: string;
  invoiceDate: string;
  invoiceAmount: string;
  itemName: string;
  description: string;
  status: string;
  attachment?: File;
  sendEmail: boolean;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onAlert?: (message: string, type: Alert['type']) => void;
}

const INVOICE_STATUS = [
  'Pending',
  'Paid'
];

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, onSave, onAlert }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    customerName: '',
    customerEmail: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceAmount: '',
    itemName: '',
    description: '',
    status: 'Pending',
    attachment: undefined,
    sendEmail: false
  });

  const updateCustomerEmail = async (customerName: string) => {
    if (!customerName) return;
    
    try {
      const { data, error } = await supabase
        .from('Customer')
        .select('Customer_Email')
        .eq('Customer_name', customerName)
        .single();

      if (error) throw error;
      if (data) {
        setFormData(prev => ({
          ...prev,
          customerEmail: data.Customer_Email || ''
        }));
      }
    } catch (err) {
      console.error('Error fetching customer email:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch customers
        const { data: customersData, error: customersError } = await supabase
          .from('Customer')
          .select('Customer_name')
          .order('Customer_name');

        if (customersError) throw customersError;

        // Fetch sale items
        const { data: itemsData, error: itemsError } = await supabase
          .from('SaleItems')
          .select('Item_Name')
          .order('Item_Name');

        if (itemsError) throw itemsError;

        setCustomers(customersData || []);
        setItems(itemsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.customerName || !formData.invoiceDate || !formData.invoiceAmount) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.attachment) {
      if (formData.attachment.size > 1024 * 1024) {
        setError('File size must not exceed 1 MB');
        return;
      }
      if (formData.attachment.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
    }

    try {
      setLoading(true);

      let attachmentPath = null;
      let invoiceId = null;
      
      if (formData.attachment) {
        const fileExt = formData.attachment.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('invoicefiles')
          .upload(filePath, formData.attachment);

        if (uploadError) throw uploadError;
        attachmentPath = filePath;
      }

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

      // Create the invoice
      const { data: invoiceData, error: insertError } = await supabase
        .from('SalesInvoice')
        .insert([{
          Customer_name: formData.customerName,
          InvoiceDate: formData.invoiceDate,
          InvoiceAmount: parseFloat(formData.invoiceAmount),
          Description: formData.description,
          Status: formData.status,
          attachment_path: attachmentPath,
          OutstandingAmount: parseFloat(formData.invoiceAmount), // Initially same as invoice amount
          ItemID: items.findIndex(item => item.Item_Name === formData.itemName) + 1,
          user_id: session.user.id
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      invoiceId = invoiceData.id;

      // Create transactions based on status
      const transactions = [];
      const amount = parseFloat(formData.invoiceAmount);

      if (formData.status === 'Pending') {
        // For Pending status:
        // 1. Debit to Accounts Receivable
        // 2. Credit to Sales Income
        transactions.push(
          {
            transaction_date: new Date().toISOString(),
            account_id: settings.accounts_receivable_account,
            debit_amount: amount,
            credit_amount: 0,
            description: `Invoice #${invoiceId} - ${formData.customerName}`,
            invoice_id: invoiceId,
            bill_id: 0,
            row_num: 1,
            Status: formData.status,
            user_id: session.user.id
          },
          {
            transaction_date: new Date().toISOString(),
            account_id: settings.sales_revenue_account,
            debit_amount: 0,
            credit_amount: amount,
            description: `Invoice #${invoiceId} - ${formData.customerName}`,
            invoice_id: invoiceId,
            bill_id: 0,
            row_num: 2,
            Status: formData.status,
            user_id: session.user.id
          }
        );
      } else if (formData.status === 'Paid') {
        // For Paid status:
        // 1. Credit to Accounts Receivable
        // 2. Debit to Cash Account
        transactions.push(
          {
            transaction_date: new Date().toISOString(),
            account_id: settings.accounts_receivable_account,
            debit_amount: 0,
            credit_amount: amount,
            description: `Invoice #${invoiceId} - ${formData.customerName}`,
            invoice_id: invoiceId,
            bill_id: 0,
            row_num: 1,
            Status: formData.status,
            user_id: session.user.id
          },
          {
            transaction_date: new Date().toISOString(),
            account_id: settings.cash_account,
            debit_amount: amount,
            credit_amount: 0,
            description: `Invoice #${invoiceId} - ${formData.customerName}`,
            invoice_id: invoiceId,
            bill_id: 0,
            row_num: 2,
            Status: formData.status,
            user_id: session.user.id
          }
        );
      }

      // Insert the transactions
      const { error: transactionError } = await supabase
        .from('Transaction')
        .insert(transactions);

      if (transactionError) throw transactionError;
        
      if (formData.sendEmail && formData.customerEmail) {
        onAlert?.('Sending invoice email...', 'info');
        await supabase.functions.invoke('send-invoice-email', {
          body: {
            to: formData.customerEmail,
            invoiceNumber: invoiceId,
            customerName: formData.customerName,
            amount: formData.invoiceAmount,
            attachmentPath: attachmentPath
          }
        });
        onAlert?.('Invoice email sent successfully', 'success');
      }

      onSave();
      onAlert?.('Invoice created successfully', 'success');
      onClose();
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 transition-all duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`fixed inset-y-0 right-0 w-[600px] bg-white dark:bg-gray-900 shadow-[0_0_50px_rgba(0,0,0,0.2)] transform transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="max-w-xl mx-auto w-full flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Add Invoice
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form id="invoice-form" onSubmit={handleSubmit} className="p-4 h-[calc(100vh-160px)] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="max-w-xl mx-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Name *
                </label>
                <select
                  value={formData.customerName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, customerName: value });
                    updateCustomerEmail(value);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.Customer_name} value={customer.Customer_name}>
                      {customer.Customer_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  placeholder="Will be populated from customer data"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    date.setUTCHours(0, 0, 0, 0);
                    setFormData({ ...formData, invoiceDate: e.target.value });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.invoiceAmount}
                  onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item
                </label>
                <select
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                >
                  <option value="">Select item</option>
                  {items.map((item) => (
                    <option key={item.Item_Name} value={item.Item_Name}>
                      {item.Item_Name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                >
                  {INVOICE_STATUS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all duration-200 resize-none hover:border-gray-400 dark:hover:border-gray-500"
                placeholder="Enter invoice description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attachment (PDF only, max 1MB)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setFormData({ ...formData, attachment: file });
                }}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/50 dark:file:text-blue-300"
              />
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <input
                type="checkbox"
                id="sendEmail"
                checked={formData.sendEmail}
                onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 transition-all duration-200"
              />
              <label htmlFor="sendEmail" className="text-sm text-gray-700 dark:text-gray-300">
                Send email to customer
              </label>
            </div>

            <div className="flex space-x-4 pt-2">
              <Button
                type="submit"
                variant="default" 
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-12 px-6 rounded-xl font-medium transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Invoice</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 px-6 rounded-xl font-medium border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
                onClick={onClose}
                disabled={loading}
              >
                <X className="w-5 h-5" />
                <span>Cancel</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceModal;
