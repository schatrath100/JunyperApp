import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';

interface Vendor {
  id: number;
  vendor_name: string;
  vendor_desc: string;
  vendor_taxid: string;
  vendor_phone: string;
  vendor_address: string;
}

interface VendorFormData {
  name: string;
  description: string;
  taxId: string;
  phone: string;
  address: string;
}

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onSave: () => void;
}

const VendorModal: React.FC<VendorModalProps> = ({ isOpen, onClose, vendor, onSave }) => {
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    description: '',
    taxId: '',
    phone: '',
    address: '',
  });

  const [errors, setErrors] = useState<Partial<VendorFormData>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.vendor_name || '',
        description: vendor.vendor_desc || '',
        taxId: vendor.vendor_taxid || '',
        phone: vendor.vendor_phone?.toString() || '',
        address: vendor.vendor_address || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        taxId: '',
        phone: '',
        address: '',
      });
    }
  }, [vendor]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Partial<VendorFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');
      
      const isValid = await validateForm();
      if (isValid) {
        const vendorData = {
          vendor_name: formData.name.trim(),
          vendor_desc: formData.description.trim(),
          vendor_taxid: formData.taxId.trim() || null,
          vendor_phone: formData.phone.trim() || null,
          vendor_address: formData.address.trim(),
          user_id: user.id
        };

        const { error } = vendor
          ? await supabase
              .from('Vendor')
              .update(vendorData)
              .eq('id', vendor.id)
          : await supabase
              .from('Vendor')
              .insert([vendorData]);

        if (error) throw error;
        
        onSave();
        onClose();
      }
    } catch (err) {
      console.error('Error saving vendor:', err);
      setErrors({
        ...errors,
        name: 'Failed to save vendor. Please try again.'
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
            {vendor ? 'Edit Vendor' : 'Add Vendor'}
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
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description}</p>
              )}
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
                Address *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-500">{errors.address}</p>
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
              {saving ? 'Saving...' : (vendor ? 'Save Changes' : 'Save Vendor')}
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

export default VendorModal;
