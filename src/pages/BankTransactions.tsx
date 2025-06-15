import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Upload, FileText, FileSpreadsheet, Search, Pencil, Eye, Info } from 'lucide-react';
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
  deposit: number;
  withdrawal: number;
  amount: number;
  account_number: number;
  credit_debit_indicator: 'credit' | 'debit';
  transaction_source?: string;
  transaction_status?: string;
  created_at: string;
  updated_at?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [hoveredTransaction, setHoveredTransaction] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    bankName: '',
    description: '',
    amountMin: '',
    accountNumber: '',
    type: ''
  });

  const formatTransactionSource = (source?: string) => {
    if (!source) return 'Unknown';
    switch (source) {
      case 'manual':
        return 'Manual';
      case 'upload':
        return 'Upload';
      case 'plaid_fetch':
        return 'Plaid';
      default:
        return source;
    }
  };

  const getSourceColor = (source?: string) => {
    switch (source) {
      case 'manual':
        return 'text-blue-600 dark:text-blue-400';
      case 'upload':
        return 'text-green-600 dark:text-green-400';
      case 'plaid_fetch':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatTransactionStatus = (status?: string) => {
    if (!status) return 'New';
    
    switch (status) {
      case 'New':
        return 'New';
      case 'Categorized':
        return 'Categorized';
      case 'Reconciled':
        return 'Reconciled';
      case 'Excluded':
        return 'Excluded';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return 'New';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'New':
        return 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30';
      case 'Categorized':
        return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30';
      case 'Reconciled':
        return 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30';
      case 'Excluded':
        return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30';
      case 'Cancelled':
        return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-900/30';
      default:
        return 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30';
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Bank Transactions', 14, 15);

    const tableData = filteredTransactions.map(transaction => [
      new Date(transaction.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      transaction.bank_name,
      transaction.description,
      transaction.deposit > 0 ? `$${transaction.deposit.toFixed(2)}` : '-',
      transaction.withdrawal > 0 ? `$${transaction.withdrawal.toFixed(2)}` : '-',
      transaction.account_number.toString(),
      formatTransactionSource(transaction.transaction_source),
      formatTransactionStatus(transaction.transaction_status)
    ]);

    autoTable(doc, {
      head: [['Date', 'Bank Name', 'Description', 'Deposit', 'Withdrawal', 'Account Number', 'Source', 'Status']],
      body: tableData,
      startY: 20,
    });

    doc.save('bank-transactions.pdf');
  };

  const exportToExcel = () => {
    const data = filteredTransactions.map(transaction => ({
      Date: new Date(transaction.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      'Bank Name': transaction.bank_name,
      Description: transaction.description,
      Deposit: transaction.deposit,
      Withdrawal: transaction.withdrawal,
      'Account Number': transaction.account_number,
      'Transaction Source': formatTransactionSource(transaction.transaction_source),
      'Status': formatTransactionStatus(transaction.transaction_status)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Transactions');
    
    XLSX.writeFile(wb, 'bank-transactions.xlsx');
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      let query = supabase
        .from('bank_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('deleted', false) // Only fetch non-deleted transactions
        .order('date', { ascending: false });

      // Apply search query to database
      if (debouncedSearchQuery.trim()) {
        query = query.or(`description.ilike.%${debouncedSearchQuery}%,bank_name.ilike.%${debouncedSearchQuery}%,transaction_source.ilike.%${debouncedSearchQuery}%,transaction_status.ilike.%${debouncedSearchQuery}%`);
      }

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters.bankName) {
        query = query.ilike('bank_name', `%${filters.bankName}%`);
      }
      if (filters.description) {
        query = query.ilike('description', `%${filters.description}%`);
      }
      if (filters.amountMin) {
        const minAmount = parseFloat(filters.amountMin);
        query = query.or(`deposit.gte.${minAmount},withdrawal.gte.${minAmount}`);
      }
      if (filters.accountNumber) {
        query = query.eq('account_number', parseInt(filters.accountNumber));
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setTransactions(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      onAlert?.('Failed to fetch transactions', 'error');
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

  // Since search is now handled at database level, we don't need client-side filtering
  const filteredTransactions = transactions;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const totalPages = Math.ceil(totalCount / pageSize);
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to first page when search query changes
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) return; // Only reset when debounced query is set
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery]);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filters, debouncedSearchQuery]);

  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    },
    {
      key: 'bank_name',
      label: 'Bank Name',
      sortable: true
    },
    {
      key: 'description',
      label: 'Description',
      sortable: true
    },
    {
      key: 'deposit',
      label: 'Deposit',
      sortable: true,
      render: (value: number) => value > 0 ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value) : '-'
    },
    {
      key: 'withdrawal',
      label: 'Withdrawal',
      sortable: true,
      render: (value: number) => value > 0 ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value) : '-'
    },
    {
      key: 'account_number',
      label: 'Account Number',
      sortable: true
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_: any, row: BankTransaction) => (
        <div className="flex space-x-2">
          <div className="relative">
            <button
              onMouseEnter={() => setHoveredTransaction(row.id)}
              onMouseLeave={() => setHoveredTransaction(null)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all duration-200"
              title="View Transaction Details"
              onClick={() => {
                setSelectedTransaction(row);
                setShowViewModal(true);
              }}
            >
              <Eye className="w-4 h-4" />
            </button>
            
            {/* Hover Card */}
            {hoveredTransaction === row.id && (
              <div className="absolute right-0 top-8 z-50 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <Info className="w-4 h-4 text-blue-500" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Transaction Details</h4>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Date:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(row.date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Bank:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{row.bank_name}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Description:</span>
                      <span className="font-medium text-gray-900 dark:text-white text-right max-w-48 truncate">
                        {row.description}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <span className={`font-medium ${row.credit_debit_indicator === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {row.credit_debit_indicator === 'credit' ? 'Credit' : 'Debit'}
                      </span>
                    </div>
                    
                    {row.deposit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Deposit:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(row.deposit)}
                        </span>
                      </div>
                    )}
                    
                    {row.withdrawal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Withdrawal:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(row.withdrawal)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Account:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{row.account_number}</span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Created:</span>
                        <span className="text-gray-600 dark:text-gray-300">
                          {new Date(row.created_at).toLocaleString()}
                        </span>
                      </div>
                      {row.updated_at && row.updated_at !== row.created_at && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                          <span className="text-gray-600 dark:text-gray-300">
                            {new Date(row.updated_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )
    }
  ];

  return (
    <div className="p-6 pr-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Transactions</h1>
          <button
            onClick={fetchTransactions}
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
              placeholder="Search by description, bank, source, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="h-10 w-10 flex items-center justify-center text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Upload CSV"
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            onClick={exportToPDF}
            className="h-10 w-10 flex items-center justify-center text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Export to PDF"
          >
            <FileText className="w-5 h-5" />
          </button>
          <button
            onClick={exportToExcel}
            className="h-10 w-10 flex items-center justify-center text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-500 transition-colors rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Export to Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 mr-8">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <th className="px-3 py-3 bg-gray-50 dark:bg-gray-800 text-left w-24">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Date</span>
                </th>
                <th className="px-3 py-3 bg-gray-50 dark:bg-gray-800 text-left w-36">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Bank Name</span>
                </th>
                <th className="px-3 py-3 bg-gray-50 dark:bg-gray-800 text-left w-32">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</span>
                </th>
                <th className="px-3 py-3 bg-gray-50 dark:bg-gray-800 text-left w-28">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Deposit</span>
                </th>
                <th className="px-3 py-3 bg-gray-50 dark:bg-gray-800 text-left w-28">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Withdrawal</span>
                </th>
                <th className="px-3 py-3 bg-gray-50 dark:bg-gray-800 text-left w-24">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Account</span>
                </th>
                <th className="px-3 py-3 bg-gray-50 dark:bg-gray-800 text-left w-24">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Source</span>
                </th>
                <th className="px-3 py-3 bg-gray-50 dark:bg-gray-800 text-left w-28">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Status</span>
                </th>
                <th className="px-1 py-3 bg-gray-50 dark:bg-gray-800 text-right w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="px-3 py-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {new Date(transaction.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-36">
                      {transaction.bank_name}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <span 
                      className="text-sm text-gray-900 dark:text-gray-100 block truncate max-w-32" 
                      title={transaction.description}
                    >
                      {transaction.description}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <span className={`text-sm ${transaction.deposit > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {transaction.deposit > 0 ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(transaction.deposit) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <span className={`text-sm ${transaction.withdrawal > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                      {transaction.withdrawal > 0 ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(transaction.withdrawal) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {transaction.account_number}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <span className={`text-sm font-medium ${getSourceColor(transaction.transaction_source)}`}>
                      {formatTransactionSource(transaction.transaction_source)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(transaction.transaction_status)}`}>
                      {formatTransactionStatus(transaction.transaction_status)}
                    </span>
                  </TableCell>
                  <TableCell className="px-1 py-2">
                    <div className="flex justify-end">
                      <div className="relative">
                        <button
                          onMouseEnter={() => setHoveredTransaction(transaction.id)}
                          onMouseLeave={() => setHoveredTransaction(null)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all duration-200"
                          title="View Transaction Details"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {/* Hover Card */}
                        {hoveredTransaction === transaction.id && (
                          <div className="absolute right-0 top-8 z-50 w-80 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                <Info className="w-4 h-4 text-blue-500" />
                                <h4 className="font-semibold text-gray-900 dark:text-white">Transaction Details</h4>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {new Date(transaction.date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric' 
                                    })}
                                  </span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Bank:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{transaction.bank_name}</span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Description:</span>
                                  <span className="font-medium text-gray-900 dark:text-white text-right max-w-48 truncate">
                                    {transaction.description}
                                  </span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                                  <span className={`font-medium ${transaction.credit_debit_indicator === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {transaction.credit_debit_indicator === 'credit' ? 'Credit' : 'Debit'}
                                  </span>
                                </div>
                                
                                {transaction.deposit > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Deposit:</span>
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                      {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD'
                                      }).format(transaction.deposit)}
                                    </span>
                                  </div>
                                )}
                                
                                {transaction.withdrawal > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Withdrawal:</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">
                                      {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD'
                                      }).format(transaction.withdrawal)}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Account:</span>
                                  <span className="font-medium text-gray-900 dark:text-white">{transaction.account_number}</span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Source:</span>
                                  <span className={`font-medium ${getSourceColor(transaction.transaction_source)}`}>
                                    {formatTransactionSource(transaction.transaction_source)}
                                  </span>
                                </div>

                                <div className="flex justify-between">
                                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(transaction.transaction_status)}`}>
                                    {formatTransactionStatus(transaction.transaction_status)}
                                  </span>
                                </div>
                                
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                                    <span className="text-gray-600 dark:text-gray-300">
                                      {new Date(transaction.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  {transaction.updated_at && transaction.updated_at !== transaction.created_at && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                                      <span className="text-gray-600 dark:text-gray-300">
                                        {new Date(transaction.updated_at).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === Math.ceil(totalCount / pageSize)}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0"
                  >
                    <span className="sr-only">Previous</span>
                    Previous
                  </button>
                  {getPageNumbers().map((number) => (
                    <button
                      key={number}
                      onClick={() => handlePageChange(number)}
                      className={cn(
                        'relative inline-flex items-center px-4 py-2 text-sm font-semibold',
                        number === currentPage
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0'
                      )}
                    >
                      {number}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(totalCount / pageSize)}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0"
                  >
                    <span className="sr-only">Next</span>
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <BankTransactionUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onAlert={onAlert}
        onSuccess={() => {
          setCurrentPage(1); // Reset to first page to show newly uploaded transactions
          setSearchQuery(''); // Clear search to show all transactions
          setFilters({
            dateFrom: '',
            bankName: '',
            description: '',
            amountMin: '',
            accountNumber: '',
            type: ''
          }); // Clear all filters
          fetchTransactions();
        }}
      />

      <BankTransactionViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        transaction={selectedTransaction}
      />

      <BankTransactionAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAlert={onAlert}
        onSave={() => {
          setCurrentPage(1); // Reset to first page to show newly added transaction
          setSearchQuery(''); // Clear search to show all transactions
          setFilters({
            dateFrom: '',
            bankName: '',
            description: '',
            amountMin: '',
            accountNumber: '',
            type: ''
          }); // Clear all filters
          fetchTransactions();
        }}
      />

      <BankTransactionEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onAlert={onAlert}
        onSave={() => {
          // Don't reset page for edits - keep user on current page
          fetchTransactions();
        }}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default BankTransactions;