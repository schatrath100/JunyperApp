import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Trash2, Pencil } from 'lucide-react';
import Button from '../components/Button';
import VendorModal from '../components/VendorModal';
import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

interface Vendor {
  id: number;
  vendor_name: string;
  vendor_desc: string;
  vendor_taxid: string;
  vendor_phone: string;
  vendor_address: string;
}

const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { sortedItems: sortedVendors, sortConfig, requestSort } = useTableSort(
    vendors,
    { key: 'vendor_name', direction: 'asc' }
  );

  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('Vendor')
        .select('*')
        .order('vendor_name');

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
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
      selectedRows.length === vendors.length
        ? []
        : vendors.map(vendor => vendor.id)
    );
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('Vendor')
        .delete()
        .in('id', selectedRows);

      if (deleteError) throw deleteError;

      setSelectedRows([]);
      setShowDeleteConfirm(false);
      await fetchVendors();
    } catch (err) {
      console.error('Error deleting vendors:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete vendors');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendors</h1>
          <button
            onClick={fetchVendors}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {selectedRows.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Delete selected vendors"
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
              setEditingVendor(null);
              setIsModalOpen(true);
            }}
          >
            Add Vendor
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
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    checked={selectedRows.length === vendors.length && vendors.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <TableHead onClick={() => requestSort('vendor_name')} className="cursor-pointer">
                  Name
                </TableHead>
                <TableHead onClick={() => requestSort('vendor_desc')} className="cursor-pointer">
                  Description
                </TableHead>
                <TableHead onClick={() => requestSort('vendor_taxid')} className="cursor-pointer">
                  Tax ID
                </TableHead>
                <TableHead onClick={() => requestSort('vendor_phone')} className="cursor-pointer">
                  Phone
                </TableHead>
                <TableHead onClick={() => requestSort('vendor_address')} className="cursor-pointer">
                  Address
                </TableHead>
                <TableHead>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVendors.map((vendor) => (
                <TableRow 
                  key={vendor.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedRows.includes(vendor.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.includes(vendor.id)}
                      onChange={() => handleRowSelect(vendor.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {vendor.vendor_name}
                  </TableCell>
                  <TableCell>
                    {vendor.vendor_desc}
                  </TableCell>
                  <TableCell>
                    {vendor.vendor_taxid || '-'}
                  </TableCell>
                  <TableCell>
                    {vendor.vendor_phone || '-'}
                  </TableCell>
                  <TableCell>
                    {vendor.vendor_address}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Edit vendor"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {vendors.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No vendors found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <VendorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVendor(null);
        }}
        vendor={editingVendor}
        onSave={fetchVendors}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete {selectedRows.length} selected vendor{selectedRows.length > 1 ? 's' : ''}? 
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

export default Vendors;