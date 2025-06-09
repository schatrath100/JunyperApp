import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Upload, FileText, FileSpreadsheet, PlusCircle, Pencil, Search, Trash2, ChevronDown, Sun, Moon, Bell, User } from 'lucide-react';
import Button from '../components/Button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../components/ui/table';
import FilterableTableHead from '../components/FilterableTableHead';
import BankTransactionUploadModal from '../components/BankTransactionUploadModal';
import BankTransactionViewModal from '../components/BankTransactionViewModal';
import BankTransactionAddModal from '../components/BankTransactionAddModal';
import BankTransactionEditModal from '../components/BankTransactionEditModal';
import type { Alert } from '../components/Alert';

interface BankTransaction {
  id: string;
  date: string;
  bank_name: string;
  description: string;
  amount: number;
  account_number: number;
  credit_debit_indicator: 'credit' | 'debit';
}

interface FilterState {
  dateFrom: string;
  bankName: string;
  description: string;
  amountMin: string;
  accountNumber: string;
  type: string;
}

interface BankTransactionsProps {
  onAlert?: (message: string, type: Alert['type']) => void;
}

const BankTransactions: React.FC<BankTransactionsProps> = ({ onAlert }) => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [showBankFilter, setShowBankFilter] = useState(false);
  const [showDescriptionFilter, setShowDescriptionFilter] = useState(false);
  const [showAmountFilter, setShowAmountFilter] = useState(false);
  const [showAccountFilter, setShowAccountFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Bank Transactions', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

    // Prepare table data
    const tableData = transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.bank_name,
      t.description,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(t.amount),
      t.account_number,
      t.credit_debit_indicator
    ]);

    // Generate table
    autoTable(doc, {
      head: [['Date', 'Bank', 'Description', 'Amount', 'Account #', 'Type']],
      body: tableData,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Save PDF
    doc.save('bank-transactions.pdf');
  };

  const exportToExcel = () => {
    // Prepare data
    const data = transactions.map(t => ({
      'Date': new Date(t.date).toLocaleDateString(),
      'Bank': t.bank_name,
      'Description': t.description,
      'Amount': t.amount,
      'Account Number': t.account_number,
      'Type': t.credit_debit_indicator
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Transactions');

    // Save file
    XLSX.writeFile(wb, 'bank-transactions.xlsx');
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    bankName: '',
    description: '',
    amountMin: '',
    accountNumber: '',
    type: ''
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get total count first
      let countQuery = supabase
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true });

      // Apply filters to count query
      if (filters.dateFrom) {
        countQuery = countQuery.gte('date', filters.dateFrom);
      }
      if (filters.bankName) {
        countQuery = countQuery.ilike('bank_name', `%${filters.bankName}%`);
      }
      if (filters.description) {
        countQuery = countQuery.ilike('description', `%${filters.description}%`);
      }
      if (filters.amountMin) {
        countQuery = countQuery.gte('amount', parseFloat(filters.amountMin));
      }
      if (filters.accountNumber) {
        countQuery = countQuery.eq('account_number', filters.accountNumber);
      }
      if (filters.type) {
        countQuery = countQuery.eq('credit_debit_indicator', filters.type);
      }

      const { count, error: countError } = await countQuery;
      
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Fetch paginated data
      let dataQuery = supabase
        .from('bank_transactions')
        .select('*');

      // Apply filters
      if (filters.dateFrom) {
        dataQuery = dataQuery.gte('date', filters.dateFrom);
      }
      if (filters.bankName) {
        dataQuery = dataQuery.ilike('bank_name', `%${filters.bankName}%`);
      }
      if (filters.description) {
        dataQuery = dataQuery.ilike('description', `%${filters.description}%`);
      }
      if (filters.amountMin) {
        dataQuery = dataQuery.gte('amount', parseFloat(filters.amountMin));
      }
      if (filters.accountNumber) {
        dataQuery = dataQuery.eq('account_number', filters.accountNumber);
      }
      if (filters.type) {
        dataQuery = dataQuery.eq('credit_debit_indicator', filters.type);
      }

      // Add pagination and ordering
      dataQuery = dataQuery
        .order('date', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      const { data, error: dataError } = await dataQuery;

      if (dataError) throw dataError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleEdit = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (!selectedTransaction?.id) return;

    try {
      setDeleteLoading(true);
      setError(null);

      // Delete the transaction
      const { data, error: deleteError } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', selectedTransaction.id)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (deleteError) throw deleteError;

      setShowDeleteConfirm(false);
      onAlert?.('Transaction deleted successfully', 'success');
      await fetchTransactions();
      setSelectedTransaction(null);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filters, currentPage, pageSize]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('bank_transactions').select('*').limit(1);
        if (error) throw error;
        console.log('Supabase connection successful:', data);
      } catch (error) {
        console.error('Supabase connection error:', error);
      }
    };
    testConnection();
  }, []);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Calculate start and end of visible pages
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, startPage + 2);
      
      // Adjust if we're near the end
      if (endPage === totalPages - 1) {
        startPage = Math.max(2, endPage - 2);
      }
      
      // Add ellipsis if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always show last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter(transaction => {
    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.bank_name.toLowerCase().includes(searchLower) ||
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.account_number.toString().includes(searchLower) ||
      transaction.credit_debit_indicator.toString().includes(searchLower)
    );
  });

  // Calculate pagination for filtered transactions
  const totalPagesFiltered = Math.ceil(filteredTransactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Transactions</h1>
          <button
            onClick={fetchTransactions}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Add transaction"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 px-4 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
            onClick={() => setShowUploadModal(true)}
            icon={<Upload className="w-4 h-4" />}
          >
            Upload Transactions
          </Button>
          <button
            onClick={exportToPDF}
            className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Export to PDF"
          >
            <FileText className="w-5 h-5" />
          </button>
          <button
            onClick={exportToExcel}
            className="p-2 text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-500 transition-colors rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Export to Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Date
                </span>
              </th>
              <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left relative">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Bank name
                  </span>
                  <button
                    onClick={() => setShowBankFilter(!showBankFilter)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {showBankFilter && (
                  <div className="absolute z-10 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2">
                      <input
                        type="text"
                        value={filters.bankName}
                        onChange={(e) => handleFilterChange('bankName', e.target.value)}
                        placeholder="Filter bank..."
                        className="w-full px-2 py-1 text-sm border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </th>
              <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left relative">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Description
                  </span>
                  <button
                    onClick={() => setShowDescriptionFilter(!showDescriptionFilter)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {showDescriptionFilter && (
                  <div className="absolute z-10 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2">
                      <input
                        type="text"
                        value={filters.description}
                        onChange={(e) => handleFilterChange('description', e.target.value)}
                        placeholder="Filter description..."
                        className="w-full px-2 py-1 text-sm border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </th>
              <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left relative">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Amount
                  </span>
                  <button
                    onClick={() => setShowAmountFilter(!showAmountFilter)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {showAmountFilter && (
                  <div className="absolute z-10 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2">
                      <input
                        type="number"
                        value={filters.amountMin}
                        onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                        placeholder="Min amount..."
                        className="w-full px-2 py-1 text-sm border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </th>
              <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left relative">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Account number
                  </span>
                  <button
                    onClick={() => setShowAccountFilter(!showAccountFilter)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {showAccountFilter && (
                  <div className="absolute z-10 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2">
                      <input
                        type="text"
                        value={filters.accountNumber}
                        onChange={(e) => handleFilterChange('accountNumber', e.target.value)}
                        placeholder="Filter account..."
                        className="w-full px-2 py-1 text-sm border rounded-md"
                      />
                    </div>
                  </div>
                )}
              </th>
              <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left relative">
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Type
                  </span>
                  <button
                    onClick={() => setShowTypeFilter(!showTypeFilter)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {showTypeFilter && (
                  <div className="absolute z-10 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-2">
                      <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded-md"
                      >
                        <option value="">All</option>
                        <option value="credit">Credit</option>
                        <option value="debit">Debit</option>
                      </select>
                    </div>
                  </div>
                )}
              </th>
              <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Actions
                </span>
              </th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {new Date(transaction.date).toLocaleDateString('en-US', { 
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </TableCell>
                <TableCell>{transaction.bank_name}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>
                  <span className={transaction.credit_debit_indicator === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(transaction.amount)}
                  </span>
                </TableCell>
                <TableCell>{transaction.account_number}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.credit_debit_indicator === 'credit'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {transaction.credit_debit_indicator}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setShowViewModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="View details"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setShowDeleteConfirm(true);
                      }}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {currentTransactions.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
                    disabled={typeof page !== 'number'}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : typeof page === 'number'
                        ? 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        : 'text-gray-400 dark:text-gray-500 cursor-default'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPagesFiltered}
                className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      <BankTransactionUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onAlert={onAlert}
        onSuccess={fetchTransactions}
      />
      
      <BankTransactionAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAlert={onAlert}
        onSave={fetchTransactions}
      />
      
      <BankTransactionViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />
      
      {/* Delete Confirmation Modal */}
      <BankTransactionEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onAlert={onAlert}
        onSave={fetchTransactions}
        transaction={selectedTransaction}
      />
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedTransaction(null);
                }}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="!bg-red-500 hover:!bg-red-600"
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

export default BankTransactions;