import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';

interface Customer {
  id: number;
  Customer_name: string;
  Customer_Email: string;
  Customer_address: string;
  Customer_Phone: string;
  Customer_TaxID?: number;
  Customer_PaymentTerms?: string | number;
  updated_at?: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  paymentTerms: string;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSave: (customer: Customer) => void;
}

const PAYMENT_TERMS = [
  { value: '0', label: '0 days' },
  { value: '7', label: '7 days' },
  { value: '10', label: '10 days' },
  { value: '15', label: '15 days' },
  { value: '30', label: '30 days' },
  { value: '45', label: '45 days' },
];

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customer: initialCustomer, onSave }) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    address: '',
    paymentTerms: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      taxId: '',
      address: '',
      paymentTerms: '',
    });
    setErrors({});
    setError(null);
    setCustomerData(null);
  };

  useEffect(() => {
    if (initialCustomer) {
      // Fetch the latest customer data
      const fetchCustomer = async () => {
        const { data, error } = await supabase
          .from('Customer')
          .select('*')
          .eq('id', initialCustomer.id)
          .single();

        if (error) {
          console.error('Error fetching customer:', error);
          return;
        }

        if (data) {
          setCustomerData(data);
          setFormData({
            name: data.Customer_name || '',
            email: data.Customer_Email || '',
            phone: data.Customer_Phone?.toString() || '',
            taxId: data.Customer_TaxID?.toString() || '',
            address: data.Customer_address || '',
            paymentTerms: data.Customer_PaymentTerms || '',
          });
        }
      };

      fetchCustomer();
    } else {
      // Reset form when adding new customer
      resetForm();
    }
  }, [initialCustomer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form:', formData);

    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.paymentTerms) {
      newErrors.paymentTerms = 'Payment terms are required';
    }

    if (Object.keys(newErrors).length > 0) {
      console.log('Validation errors:', newErrors);
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const customerData = {
        Customer_name: formData.name.trim(),
        Customer_Email: formData.email.trim(),
        Customer_Phone: formData.phone ? formData.phone.trim() : null,
        Customer_TaxID: formData.taxId ? formData.taxId.trim() : null,
        Customer_address: formData.address ? formData.address.trim() : null,
        Customer_PaymentTerms: formData.paymentTerms,
        user_id: (await supabase.auth.getUser()).data.user?.id
      };

      console.log('Saving customer data:', customerData);

      if (initialCustomer) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('Customer')
          .update(customerData)
          .eq('id', initialCustomer.id);

        if (updateError) throw updateError;
        console.log('Customer updated successfully');
      } else {
        // Create new customer
        const { error: insertError } = await supabase
          .from('Customer')
          .insert([customerData]);

        if (insertError) throw insertError;
        console.log('Customer created successfully');
      }

      onSave(customerData);
      onClose();
    } catch (err) {
      console.error('Error saving customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setSaving(false);
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
      <div className="fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {initialCustomer ? 'Edit Customer' : 'Add Customer'}
            </h2>
            {customerData && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Last updated: {new Date(customerData.updated_at!).toLocaleString()}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form id="invoice-form" onSubmit={handleSubmit} className="p-4 h-[calc(100vh-160px)] overflow-y-auto">
          {error && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="max-w-xl mx-auto space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-0.5 text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <p className="mt-0.5 text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Billing Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Payment Terms *
                </label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                    errors.paymentTerms ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select payment terms</option>
                  {PAYMENT_TERMS.map((term) => (
                    <option key={term.value} value={term.value}>
                      {term.label}
                    </option>
                  ))}
                </select>
                {errors.paymentTerms && (
                  <p className="mt-0.5 text-xs text-red-500">{errors.paymentTerms}</p>
                )}
              </div>

              <div className="col-span-2 mt-2">
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="default"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    disabled={saving}
                    onClick={handleSubmit}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
                    onClick={onClose}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
