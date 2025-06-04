import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  onSave: () => void;
}

const PAYMENT_TERMS = [
  { value: '0', label: '0 days' },
  { value: '7', label: '7 days' },
  { value: '10', label: '10 days' },
  { value: '15', label: '15 days' },
  { value: '30', label: '30 days' },
  { value: '45', label: '45 days' },
];

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customer, onSave }) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    address: '',
    paymentTerms: '',
  });

  const [errors, setErrors] = useState<Partial<CustomerFormData>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.Customer_name,
        email: customer.Customer_Email,
        phone: customer.Customer_Phone?.toString() || '',
        taxId: customer.Customer_TaxID?.toString() || '',
        address: customer.Customer_address || '',
        paymentTerms: customer.Customer_PaymentTerms?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        taxId: '',
        address: '',
        paymentTerms: '',
      });
    }
  }, [customer]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Partial<CustomerFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else {
      // Check for existing customer with the same name
      const { data: existingCustomers, error: checkError } = await supabase
        .from('Customer')
        .select('Customer_name')
        .eq('Customer_name', formData.name.trim())
        .neq('id', customer?.id || 0)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking customer name:', checkError);
        newErrors.name = 'Error validating customer name';
      } else if (existingCustomers) {
        newErrors.name = 'Customer with the same name exists. Please change the name.';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.paymentTerms) {
      newErrors.paymentTerms = 'Payment terms are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const isValid = await validateForm();
      
      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');
      
      if (isValid) {        
        const customerData = {
          Customer_name: formData.name,
          Customer_Email: formData.email,
          Customer_Phone: formData.phone ? Number(formData.phone) : null,
          Customer_TaxID: formData.taxId ? Number(formData.taxId) : null,
          Customer_address: formData.address,
          Customer_PaymentTerms: formData.paymentTerms,
          user_id: user.id
        };

        const { error } = customer
          ? await supabase
              .from('Customer')
              .update(customerData)
              .eq('id', customer.id)
          : await supabase
          .from('Customer')
          .insert([customerData]);

        if (error) throw error;
        
        onSave();
        onClose();
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      setErrors({
        ...errors,
        name: 'Failed to save customer. Please try again.'
      });
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
      <div 
        className={`fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {customer ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 h-[calc(100vh-160px)] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax ID
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Billing Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Terms *
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
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
                <p className="mt-1 text-sm text-red-500">{errors.paymentTerms}</p>
              )}
            </div>
          </div>

        </form>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            <Button
              type="submit"
              variant="primary"
              className="flex-1 bg-black hover:bg-black/90 text-white"
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;
