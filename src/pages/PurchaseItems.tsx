import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Trash2, Pencil } from 'lucide-react';
import Button from '../components/Button';
import PurchaseItemModal from '../components/PurchaseItemModal';
import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

interface PurchaseItem {
  id: number;
  Item_name: string;
  Item_desc: string;
  Item_price: number;
  item_num: number;
  created_at: string;
}

const PurchaseItems: React.FC = () => {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { sortedItems, sortConfig, requestSort } = useTableSort(
    items,
    { key: 'Item_name', direction: 'asc' }
  );

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('PurchaseItems')
        .select('*')
        .order('Item_name');

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleRowSelect = (id: number) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedRows(
      selectedRows.length === items.length
        ? []
        : items.map(item => item.id)
    );
  };

  const handleEdit = (item: PurchaseItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('PurchaseItems')
        .delete()
        .in('id', selectedRows);

      if (deleteError) throw deleteError;

      setSelectedRows([]);
      setShowDeleteConfirm(false);
      await fetchItems();
    } catch (err) {
      console.error('Error deleting items:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete items');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Items</h1>
          <button
            onClick={fetchItems}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {selectedRows.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Delete selected items"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedRows.length} selected
          </div>
          <Button
            variant="default"
            className="bg-black hover:bg-black/90 text-white"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
          >
            Add Purchase Item
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    checked={selectedRows.length === items.length && items.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead onClick={() => requestSort('Item_name')} className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                  Item Name
                </TableHead>
                <TableHead onClick={() => requestSort('Item_desc')} className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                  Description
                </TableHead>
                <TableHead onClick={() => requestSort('Item_price')} className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                  Price
                </TableHead>
                <TableHead onClick={() => requestSort('item_num')} className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                  Item Number
                </TableHead>
                <TableHead>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedRows.includes(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => handleRowSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.Item_name}
                  </TableCell>
                  <TableCell>
                    {item.Item_desc}
                  </TableCell>
                  <TableCell>
                    {item.Item_price
                      ? new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        }).format(item.Item_price)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {item.item_num || '-'}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Edit item"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PurchaseItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSave={fetchItems}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete {selectedRows.length} selected item{selectedRows.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 !bg-red-500 hover:!bg-red-600"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseItems;