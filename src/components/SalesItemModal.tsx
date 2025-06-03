import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';

interface SalesItem {
  id: string;
  Item_Name: string;
  Item_Desc: string;
  Item_Number: string;
  Item_Price: number;
}

interface SalesItemFormData {
  name: string;
  description: string;
  number: string;
  price: string;
}

interface SalesItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SalesItem | null;
  onSave: () => void;
}

const SalesItemModal: React.FC<SalesItemModalProps> = ({ isOpen, onClose, item, onSave }) => {
  const [formData, setFormData] = useState<SalesItemFormData>({
    name: '',
    description: '',
    number: '',
    price: '',
  });

  const [errors, setErrors] = useState<Partial<SalesItemFormData>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.Item_Name,
        description: item.Item_Desc || '',
        number: item.Item_Number || '',
        price: item.Item_Price?.toString() || '',
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
    const newErrors: Partial<SalesItemFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else {
      // Create a query to check for duplicate names, excluding the current item if editing
      let query = supabase
        .from('SaleItems')
        .select('Item_Name')
        .eq('Item_Name', formData.name.trim());
      
      // Only add the id check if we're editing an existing item
      if (item?.id) {
        query = query.neq('id', parseInt(item.id));
      }

      const { data: existingItems, error: checkError } = await query.maybeSingle();

      if (checkError) {
        console.error('Error checking item name:', checkError);
        newErrors.name = 'Error validating item name';
      } else if (existingItems) {
        newErrors.name = 'Same name exists. Please change the name.';
      }
    }

    if (!formData.price || !formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else
    if (formData.price && isNaN(Number(formData.price))) {
      newErrors.price = 'Price must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const isValid = await validateForm();
      
      if (isValid) {
        const itemData = {
          Item_Name: formData.name.trim(),
          Item_Desc: formData.description.trim() || null,
          Item_Number: formData.number.trim() || null,
          Item_Price: formData.price.trim() ? Number(formData.price.trim()) : null,
        };

        const { error } = item
          ? await supabase
              .from('SaleItems')
              .update(itemData)
              .eq('id', item.id)
          : await supabase
              .from('SaleItems')
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {item ? 'Edit Sales Item' : 'Add Sales Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
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
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number
              </label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"> 
                Price *
              </label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-500">{errors.price}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={saving}
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
        </form>
      </div>
    </div>
  );
};

export default SalesItemModal;
