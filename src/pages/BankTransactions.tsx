import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Upload, FileText, FileSpreadsheet, PlusCircle, Pencil, Trash2 } from 'lucide-react';
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
  const [pageSize] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);

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

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Showing {transactions.length} of {totalCount} transactions
          </span>
          <Button
            variant="default"
            className="bg-black hover:bg-black/90 text-white"
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
              <FilterableTableHead
                label="Date"
                filterKey="dateFrom"
                filterValue={filters.dateFrom}
                filterType="date"
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Bank Name"
                filterKey="bankName"
                filterValue={filters.bankName}
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Description"
                filterKey="description"
                filterValue={filters.description}
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Amount"
                filterKey="amountMin"
                filterValue={filters.amountMin}
                filterType="number"
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Account Number"
                filterKey="accountNumber"
                filterValue={filters.accountNumber}
                onFilterChange={handleFilterChange}
              />
              <FilterableTableHead
                label="Type"
                filterKey="type"
                filterValue={filters.type}
                filterType="select"
                selectOptions={[
                  { value: 'credit', label: 'Credit' },
                  { value: 'debit', label: 'Debit' }
                ]}
                onFilterChange={handleFilterChange}
              />
              <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </span>
              </th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
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
                      onClick={() => handleEdit(transaction)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      title="Edit transaction"
                    >
                      <Pencil className="w-4 h-4" />
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
        <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm"
              >
                First
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm"
              >
                Previous
              </Button>
              <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm"
              >
                Next
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm"
              >
                Last
              </Button>
            </div>
          </div>
        </div>
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