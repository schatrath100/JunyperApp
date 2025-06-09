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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.Item_Name,
        description: item.Item_Desc || '',
        number: item.Item_Number?.toString() || '',
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
    } else if (formData.price && isNaN(Number(formData.price))) {
      newErrors.price = 'Price must be a valid number';
    }

    // Add validation for Item Number
    if (formData.number && formData.number.trim()) {
      if (isNaN(Number(formData.number))) {
        newErrors.number = 'Item Number must be a valid number';
      }
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
      if (userError) {
        console.error('User authentication error:', userError);
        throw userError;
      }
      if (!user) {
        console.error('No authenticated user found');
        throw new Error('No authenticated user found');
      }
      
      if (isValid) {
        const itemData = {
          Item_Name: formData.name.trim(),
          Item_Desc: formData.description.trim() || null,
          Item_Number: formData.number ? formData.number.trim() : null,
          Item_Price: formData.price.trim() ? Number(formData.price.trim()) : null,
          user_id: user.id
        };

        console.log('Attempting to save item with data:', itemData);

        const { error, data } = item
          ? await supabase
              .from('SaleItems')
              .update(itemData)
              .eq('id', item.id)
          : await supabase
              .from('SaleItems')
              .insert([itemData]);

        if (error) {
          console.error('Supabase error details:', error);
          throw error;
        }

        console.log('Item saved successfully:', data);
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

  const handleDelete = async () => {
    if (!item) return;
    
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('SaleItems')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      
      onSave();
      onClose();
    } catch (err) {
      console.error('Error deleting item:', err);
      setErrors({
        ...errors,
        name: 'Failed to delete item. Please try again.'
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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
            {item ? 'Edit Sales Item' : 'Add Sales Item'}
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
                } ${item ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                disabled={!!item}
                readOnly={!!item}
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
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.number ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.number && (
                <p className="mt-1 text-sm text-red-500">{errors.number}</p>
              )}
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

        </form>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            <Button
              type="submit"
              variant="default"
              className="flex-1 bg-black hover:bg-black/90 text-white"
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? 'Saving...' : (item ? 'Save Changes' : 'Save Item')}
            </Button>
            {item && (
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
              >
                Delete
              </Button>
            )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesItemModal;
