import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';

interface Vendor {
  vendor_name: string;
}

interface VendorBill {
  id: number;
  Date: string;
  Vendor_name: string;
  Description?: string;
  Amount: number;
  Status: string;
  attachment_path?: string | null;
}

interface Alert {
  type: 'success' | 'error' | 'info' | 'warning';
}

interface VendorBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: VendorBill | null;
  onSave: () => void;
  onAlert?: (message: string, type: Alert['type']) => void;
}

const BILL_STATUS = [
  'Pending',
  'Paid',
  'Cancelled',
  'Overdue'
];

const VendorBillModal: React.FC<VendorBillModalProps> = ({
  isOpen,
  onClose,
  bill,
  onSave,
  onAlert
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    billDate: new Date().toISOString().split('T')[0],
    vendorName: '',
    description: '',
    amount: '',
    status: 'Pending',
    attachment: undefined as File | undefined,
    attachmentPath: ''
  });

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const { data, error } = await supabase
          .from('Vendor')
          .select('vendor_name')
          .order('vendor_name');

        if (error) throw error;
        setVendors(data || []);
      } catch (err) {
        console.error('Error fetching vendors:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
      }
    };

    if (isOpen) {
      fetchVendors();
    }
  }, [isOpen]);

  useEffect(() => {
    if (bill) {
      setFormData({
        billDate: bill.Date,
        vendorName: bill.Vendor_name,
        description: bill.Description || '',
        amount: bill.Amount.toString(),
        status: bill.Status,
        attachment: undefined,
        attachmentPath: bill.attachment_path || ''
      });
    } else {
      setFormData({
        billDate: new Date().toISOString().split('T')[0],
        vendorName: '',
        description: '',
        amount: '',
        status: 'Pending',
        attachment: undefined,
        attachmentPath: ''
      });
    }
  }, [bill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // When editing, only validate status
    if (bill && !formData.status) {
      setError('Please select a status');
      return;
    }
    
    // For new bills, validate all required fields
    if (!bill && (!formData.billDate || !formData.vendorName || !formData.amount)) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Only validate and handle file upload for new bills
      let attachmentPath = null;
      if (!bill && formData.attachment) {
        if (formData.attachment.size > 1024 * 1024) {
          throw new Error('File size must not exceed 1 MB');
        }
        
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(formData.attachment.type)) {
          throw new Error('Only PDF, JPEG, and JPG files are allowed');
        }
        
        // Upload new file
        const fileExt = formData.attachment.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('vendorbills')
          .upload(filePath, formData.attachment);

        if (uploadError) throw uploadError;
        attachmentPath = filePath;
      }

      if (bill) {
        // When editing, only update the status
        const { error: updateError } = await supabase
          .from('VendorInvoice')
          .update({ Status: formData.status })
          .eq('id', bill.id);

        if (updateError) throw updateError;
      } else {
        // For new bills, handle full creation process
        const { data: maxIdData, error: maxIdError } = await supabase
          .from('VendorInvoice')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);

        if (maxIdError) throw maxIdError;

        const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;

        const billData = {
          id: nextId,
          Date: formData.billDate,
          Vendor_name: formData.vendorName,
          Description: formData.description || null,
          Amount: parseFloat(formData.amount),
          Status: formData.status,
          attachment_path: attachmentPath
        };

        const { error: insertError } = await supabase
          .from('VendorInvoice')
          .insert([billData]);

        if (insertError) throw insertError;
      }

      onSave();
      if (onAlert) {
        onAlert('Bill saved successfully', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Error saving bill:', err);
      setError(err instanceof Error ? err.message : 'Failed to save bill');
      if (onAlert) {
        onAlert('Failed to save bill', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {bill ? 'Edit Vendor Bill' : 'Add Vendor Bill'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bill Date *
              </label>
              {bill ? (
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  {new Date(formData.billDate).toLocaleDateString()}
                </div>
              ) : (
                <input
                  type="date"
                  value={formData.billDate}
                  onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vendor *
              </label>
              {bill ? (
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  {formData.vendorName}
                </div>
              ) : (
                <select
                  value={formData.vendorName}
                  onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  required
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.vendor_name} value={vendor.vendor_name}>
                      {vendor.vendor_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              {bill ? (
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 min-h-[80px]">
                  {formData.description || '-'}
                </div>
              ) : (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              {bill ? (
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(parseFloat(formData.amount))}
                </div>
              ) : (
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  required
                />
              )}
            </div>

            {bill && bill.attachment_path && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Attachment
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-mono text-sm">
                  {bill.attachment_path.split('/').pop()}
                </div>
              </div>
            )}

            {!bill && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attachment (PDF, JPEG, JPG only, max 1MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setFormData({ ...formData, attachment: file });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                required
              >
                {BILL_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Saving...' : (bill ? 'Update Status' : 'Save Bill')}
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
        </form>
      </div>
    </div>
  );
};

export default VendorBillModal;