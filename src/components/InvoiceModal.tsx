import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
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
  'Paid',
  'Partially Paid',
  'Overdue',
  'Cancelled'
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
      
      // Get the Accounts Receivable and Sales Income account IDs
      const { data: arAccount, error: arError } = await supabase
        .from('Account')
        .select('id')
        .eq('account_name', 'Accounts Receivable')
        .single();

      if (arError) throw new Error('Required accounts not found');

      const { data: salesAccount, error: salesError } = await supabase
        .from('Account')
        .select('id')
        .eq('account_name', 'Sales Income')
        .single();

      if (salesError) throw new Error('Required accounts not found');

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
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      invoiceId = invoiceData.id;

      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Create the debit and credit transactions
      const { error: transactionError } = await supabase
        .from('Transaction')
        .insert([
          {
            transaction_date: formData.invoiceDate,
            account_id: arAccount.id,
            debit_amount: parseFloat(formData.invoiceAmount),
            credit_amount: 0,
            description: `Invoice #${invoiceId} - ${formData.customerName}`,
            invoice_id: invoiceId,
            bill_id: 0,
            row_num: 1,
            Status: formData.status,
            user_id: userId
          },
          {
            transaction_date: formData.invoiceDate,
            account_id: salesAccount.id,
            debit_amount: 0,
            credit_amount: parseFloat(formData.invoiceAmount),
            description: `Invoice #${invoiceId} - ${formData.customerName}`,
            invoice_id: invoiceId,
            bill_id: 0,
            row_num: 2,
            Status: formData.status,
            user_id: userId
          }
        ]);

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
      className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`fixed inset-y-0 right-0 w-[800px] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Invoice
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="invoice-form" onSubmit={handleSubmit} className="p-4 h-[calc(100vh-160px)] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.Customer_name} value={customer.Customer_name}>
                    {customer.Customer_name}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="customer@example.com"
              />

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white [&::-webkit-calendar-picker-indicator]:dark:invert"
                required
              />

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.invoiceAmount}
                onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Item
              </label>
              <select
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.Item_Name} value={item.Item_Name}>
                    {item.Item_Name}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Enter invoice description"
              />

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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />

              <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sendEmail"
                checked={formData.sendEmail}
                onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="sendEmail" className="text-sm text-gray-700 dark:text-gray-300">
                Send email to customer automatically
              </label>
              </div>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                {INVOICE_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            <Button
              type="submit"
              variant="primary" 
              className="flex-1 bg-black hover:bg-black/90 text-white"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Saving...' : 'Save Invoice'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
