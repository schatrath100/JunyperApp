import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Trash2, Pencil, ChevronDown, Search, CheckCircle, XCircle } from 'lucide-react';
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
  Customer_TaxID?: number;
  Customer_PaymentTerms?: string | number;
  OutstandingAmount?: number;
  updated_at?: string;
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
    <div className="p-6 pr-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <button
            onClick={fetchCustomers}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Enhanced Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 mr-8">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                <TableHead 
                  onClick={() => requestSort('Customer_name')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-64 text-left font-semibold"
                >
                  <div className="flex items-center space-x-2">
                    <span>Customer Name</span>
                    {sortConfig?.key === 'Customer_name' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('Customer_Email')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-56 text-left font-semibold"
                >
                  <div className="flex items-center space-x-2">
                    <span>Email</span>
                    {sortConfig?.key === 'Customer_Email' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('Customer_Phone')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-40 text-left font-semibold"
                >
                  <div className="flex items-center space-x-2">
                    <span>Phone</span>
                    {sortConfig?.key === 'Customer_Phone' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('Customer_PaymentTerms')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-36 text-center font-semibold"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Payment Terms</span>
                    {sortConfig?.key === 'Customer_PaymentTerms' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-24 text-center font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                      <p className="text-gray-500 dark:text-gray-400">Loading customers...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-gray-900 dark:text-gray-100 font-medium">No customers found</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                          {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100 w-64">
                      <div className="truncate" title={customer.Customer_name}>
                        {customer.Customer_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300 w-56">
                      <div className="truncate" title={customer.Customer_Email}>
                        {customer.Customer_Email}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300 w-40">
                      <div className="truncate" title={customer.Customer_Phone}>
                        {customer.Customer_Phone || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-gray-600 dark:text-gray-300 w-36">
                      {customer.Customer_PaymentTerms ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400">
                          {customer.Customer_PaymentTerms} days
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="w-24">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                          title="Edit customer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCustomerToDelete(customer);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                          title="Delete customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Pagination */}
        {!loading && customers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing <span className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
                </span> to <span className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.min(currentPage * itemsPerPage, totalItems)}
                </span> of <span className="font-medium text-gray-900 dark:text-gray-100">
                  {totalItems}
                </span> customers
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm"
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Page</span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400 rounded text-sm font-medium">
                    {currentPage}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">of {Math.ceil(totalItems / itemsPerPage)}</span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage * itemsPerPage >= totalItems}
                  className="px-3 py-1.5 text-sm"
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.ceil(totalItems / itemsPerPage))}
                  disabled={currentPage * itemsPerPage >= totalItems}
                  className="px-3 py-1.5 text-sm"
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Modal */}
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

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteConfirm && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Customer</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">
                {customerToDelete.Customer_name}
              </span>? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCustomerToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 !bg-red-600 hover:!bg-red-700"
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

      {/* Enhanced Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                statusType === 'success' 
                  ? 'bg-green-100 dark:bg-green-900/50' 
                  : 'bg-red-100 dark:bg-red-900/50'
              }`}>
                {statusType === 'success' ? (
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {statusType === 'success' ? 'Success' : 'Error'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{statusMessage}</p>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={() => setShowStatusModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
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
