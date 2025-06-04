import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';

interface PurchaseItem {
  id: number;
  item_num: number;
  Item_name: string;
  Item_desc: string;
  Item_price: number;
}

interface PurchaseItemFormData {
  name: string;
  description: string;
  price: string;
}

interface PurchaseItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PurchaseItem | null;
  onSave: () => void;
}

const PurchaseItemModal: React.FC<PurchaseItemModalProps> = ({ isOpen, onClose, item, onSave }) => {
  const [formData, setFormData] = useState<PurchaseItemFormData>({
    name: '',
    description: '',
    number: '',
    price: '',
  });

  const [errors, setErrors] = useState<Partial<PurchaseItemFormData>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.Item_name || '',
        description: item.Item_desc || '',
        number: item.item_num?.toString() || '',
        price: item.Item_price?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        number: '',
        price: '',
      });
    }
  }, [item]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Partial<PurchaseItemFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Price must be a valid positive number';
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
        const itemData = {
          Item_name: formData.name.trim(),
          Item_desc: formData.description.trim(),
          item_num: formData.number ? Number(formData.number) : null,
          Item_price: formData.price.trim() ? Number(formData.price.trim()) : null,
          user_id: user.id
        };

        const { error } = item
          ? await supabase
              .from('PurchaseItems')
              .update(itemData)
              .eq('id', item.id)
          : await supabase
              .from('PurchaseItems')
              .insert([itemData]);

        if (error) throw error;
        
        onSave();
        onClose();
      }
    } catch (err) {
      console.error('Error saving item:', err);
      setErrors({
        ...errors,
        name: 'Failed to save item. Please try again.'
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
            {item ? 'Edit Purchase Item' : 'Add Purchase Item'}
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
                Item Name *
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
                Item Number
              </label>
              <input
                type="number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-500">{errors.price}</p>
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
              {saving ? 'Saving...' : (item ? 'Save Changes' : 'Save Item')}
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
}

export default PurchaseItemModal;
