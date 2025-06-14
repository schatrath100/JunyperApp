import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Trash2, Pencil, ChevronDown } from 'lucide-react';
import Button from '../components/Button';
import CustomerModal from '../components/CustomerModal';
import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { CheckCircle, XCircle } from 'lucide-react';
import { Search } from 'lucide-react';

interface Customer {
  id: number;
  Customer_name: string;
  Customer_Email: string;
  Customer_address: string;
  Customer_Phone: string;
  Customer_TaxID?: string;
  Customer_PaymentTerms?: string;
  OutstandingAmount?: number;
}

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Customer>('Customer_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const { sortedItems: sortedCustomers, sortConfig, requestSort } = useTableSort(
    customers,
    { key: 'Customer_name', direction: 'asc' }
  );

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers with search query:', searchQuery);
      setLoading(true);
      setError(null);

      let query = supabase
        .from('Customer')
        .select('*', { count: 'exact' });

      // Add search filter if searchQuery exists
      if (searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        query = query.or(
          `Customer_name.ilike.${searchTerm},Customer_Email.ilike.${searchTerm}`
        );
      }

      // Add pagination
      const start = (currentPage - 1) * itemsPerPage;
      query = query.range(start, start + itemsPerPage - 1);

      const { data, error, count } = await query
        .order('Customer_name', { ascending: true });

      if (error) throw error;

      console.log('Search results:', {
        query: searchQuery,
        results: data?.length || 0,
        total: count
      });
      
      setCustomers(data || []);
      setTotalItems(count || 0);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Search query changed:', searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
      fetchCustomers();
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSort = (field: keyof Customer) => {
    setSortField(field);
    setSortDirection(prevDirection => prevDirection === 'asc' ? 'desc' : 'asc');
    setCurrentPage(1);
  };

  const handleEdit = (customer: Customer) => {
    console.log('Editing customer:', customer);
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      console.log('Deleting customer with ID:', id);
      setDeleteLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('Customer')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      console.log('Customer deleted successfully');
      await fetchCustomers();
      setStatusMessage('Customer deleted successfully');
      setStatusType('success');
      setShowStatusModal(true);
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      setStatusMessage('Failed to delete customer');
      setStatusType('error');
      setShowStatusModal(true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSave = (data: any) => {
    console.log('Saving customer:', data);
    fetchCustomers();
    setEditingCustomer(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowModal(true)}
            >
              Add Customer
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('Customer_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {sortConfig?.key === 'Customer_name' && (
                        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('Customer_Email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {sortField === 'Customer_Email' && (
                        <ChevronDown className={`w-4 h-4 transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('Customer_Phone')}
                  >
                    <div className="flex items-center gap-2">
                      Phone
                      {sortField === 'Customer_Phone' && (
                        <ChevronDown className={`w-4 h-4 transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('Customer_PaymentTerms')}
                  >
                    <div className="flex items-center gap-2">
                      Payment Terms
                      {sortField === 'Customer_PaymentTerms' && (
                        <ChevronDown className={`w-4 h-4 transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : sortedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  sortedCustomers.map((customer) => (
                    <tr 
                      key={customer.id} 
                      className="group transition-all duration-200 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-700/70 hover:shadow-sm"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium group-hover:bg-gray-100 dark:group-hover:bg-gray-700/70">
                        {customer.Customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-700/70">
                        {customer.Customer_Email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-700/70">
                        {customer.Customer_Phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-700/70">
                        {customer.Customer_PaymentTerms ? `${customer.Customer_PaymentTerms} days` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium group-hover:bg-gray-100 dark:group-hover:bg-gray-700/70">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCustomerToDelete(customer);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {customers.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No customers found</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          )}

          {!loading && customers.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} customers
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage * itemsPerPage >= totalItems}
                    className="px-3 py-1"
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
                    disabled={currentPage * itemsPerPage >= totalItems}
                    className="px-3 py-1"
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CustomerModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingCustomer(null);
          }}
          onSave={handleSave}
          customer={editingCustomer}
        />
      )}

      {showDeleteConfirm && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Delete Customer</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete {customerToDelete.Customer_name}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCustomerToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDelete(customerToDelete.id);
                  setShowDeleteConfirm(false);
                  setCustomerToDelete(null);
                }}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className={`text-center ${statusType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {statusType === 'success' ? (
                <CheckCircle className="w-12 h-12 mx-auto mb-4" />
              ) : (
                <XCircle className="w-12 h-12 mx-auto mb-4" />
              )}
              <p className="text-lg font-medium mb-2">{statusMessage}</p>
            </div>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => setShowStatusModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
