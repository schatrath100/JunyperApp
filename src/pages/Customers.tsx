import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Trash2, Pencil } from 'lucide-react';
import Button from '../components/Button';
import CustomerModal from '../components/CustomerModal';
import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

interface Customer {
  id: number;
  Customer_name: string;
  Customer_Email: string;
  Customer_address: string;
  Customer_Phone: string;
  OutstandingAmount?: number;
}

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { sortedItems: sortedCustomers, sortConfig, requestSort } = useTableSort(
    customers,
    { key: 'Customer_name', direction: 'asc' }
  );

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, fetch all customers
      const { data: customersData, error: customersError } = await supabase
        .from('Customer')
        .select(`
          id,
          Customer_name,
          Customer_Email,
          Customer_address,
          Customer_Phone,
          Customer_TaxID
        `);

      if (customersError) throw customersError;

      // Then, fetch all sales invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('SalesInvoice')
        .select('Customer_name, OutstandingAmount');

      if (invoicesError) throw invoicesError;

      // Combine the data
      const customersWithReceivables = customersData.map(customer => {
        const customerInvoices = invoicesData.filter(
          invoice => invoice.Customer_name === customer.Customer_name
        );
        
        const totalOutstanding = customerInvoices.reduce(
          (sum, invoice) => sum + (invoice.OutstandingAmount || 0),
          0
        );

        return {
          ...customer,
          OutstandingAmount: totalOutstanding
        };
      });

      setCustomers(customersWithReceivables);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
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
      selectedRows.length === customers.length
        ? []
        : customers.map(customer => customer.id)
    );
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      setError(null);

      // Check if any selected customers have outstanding amounts
      const selectedCustomers = customers.filter(c => selectedRows.includes(c.id));
      const hasOutstanding = selectedCustomers.some(c => (c.OutstandingAmount || 0) > 0);
      
      if (hasOutstanding) {
        throw new Error('Cannot delete customers with outstanding balances');
      }

      const { error: deleteError } = await supabase
        .from('Customer')
        .delete()
        .in('id', selectedRows);

      if (deleteError) throw deleteError;

      setSelectedRows([]);
      setShowDeleteConfirm(false);
      await fetchCustomers();
    } catch (err) {
      console.error('Error deleting customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete customers');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveCustomer = (data: any) => {
    fetchCustomers();
    setEditingCustomer(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <button
            onClick={fetchCustomers}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={loading || showDeleteConfirm}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {selectedRows.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Delete selected customers"
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
            onClick={() => setIsModalOpen(true)}
          >
            Add Customer
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
                <th className="w-12 px-6 py-3 bg-gray-50 dark:bg-gray-800">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    checked={selectedRows.length === customers.length && customers.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <TableHead onClick={() => requestSort('Customer_name')} className="cursor-pointer">
                  Name
                </TableHead>
                <TableHead onClick={() => requestSort('Customer_Email')} className="cursor-pointer">
                  Email
                </TableHead>
                <TableHead onClick={() => requestSort('Customer_address')} className="cursor-pointer">
                  Address
                </TableHead>
                <TableHead onClick={() => requestSort('Customer_Phone')} className="cursor-pointer">
                  Phone
                </TableHead>
                <TableHead onClick={() => requestSort('Customer_TaxID')} className="cursor-pointer">
                  Tax ID
                </TableHead>
                <TableHead onClick={() => requestSort('OutstandingAmount')} className="cursor-pointer">
                  Receivable
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCustomers.map((customer) => (
                <TableRow 
                  key={customer.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedRows.includes(customer.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.includes(customer.id)}
                      onChange={() => handleRowSelect(customer.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {customer.Customer_name}
                  </TableCell>
                  <TableCell>
                    {customer.Customer_Email}
                  </TableCell>
                  <TableCell>
                    {customer.Customer_address}
                  </TableCell>
                  <TableCell>
                    {customer.Customer_Phone}
                  </TableCell>
                  <TableCell>
                    {customer.Customer_TaxID || '-'}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(customer.OutstandingAmount || 0)}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleEdit(customer)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Edit customer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No customers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={editingCustomer}
        onSave={handleSaveCustomer}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete {selectedRows.length} selected customer{selectedRows.length > 1 ? 's' : ''}? 
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

export default Customers;