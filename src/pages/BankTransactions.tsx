import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Upload, FileText, FileSpreadsheet, Search, Pencil, Eye, Trash2, Info } from 'lucide-react';
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
      transaction.account_number.toString()
    ]);

    autoTable(doc, {
      head: [['Date', 'Bank Name', 'Description', 'Deposit', 'Withdrawal', 'Account Number']],
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
      'Account Number': transaction.account_number
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
        query = query.or(`description.ilike.%${debouncedSearchQuery}%,bank_name.ilike.%${debouncedSearchQuery}%`);
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

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase.rpc('soft_delete_bank_transaction', {
        transaction_id: transactionId
      });

      if (error) throw error;

      onAlert?.('Transaction deleted successfully', 'success');
      fetchTransactions(); // Refresh the list
    } catch (err) {
      console.error('Error deleting transaction:', err);
      onAlert?.('Failed to delete transaction', 'error');
    }
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
          <button
            onClick={() => handleDeleteTransaction(row.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all duration-200"
            title="Delete Transaction"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Transactions</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchTransactions}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw 
                  className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} 
                />
                <span>Refresh</span>
              </button>
              <div className="relative group">
                <Button
                  variant="default"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 group flex items-center justify-center overflow-hidden min-w-[40px] min-h-[40px]"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="w-6 h-6 flex-shrink-0" />
                  <span className="w-0 group-hover:w-auto group-hover:ml-2 opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap">
                    Add Bank Transaction
                  </span>
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search all transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-4 py-2 pl-10 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
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
                {/* Show loading spinner when search is being debounced */}
                {searchQuery !== debouncedSearchQuery && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5 flex items-center space-x-2"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Transactions</span>
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

                     <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
             <Table>
               <TableHeader>
                 <TableRow>
                   <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                     <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Date</span>
                   </th>
                   <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                     <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Bank Name</span>
                   </th>
                   <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                     <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</span>
                   </th>
                   <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                     <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Deposit</span>
                   </th>
                   <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                     <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Withdrawal</span>
                   </th>
                   <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                     <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Account Number</span>
                   </th>
                   <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
                     <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Actions</span>
                   </th>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredTransactions.map((transaction) => (
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
                       <span className={transaction.deposit > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                         {transaction.deposit > 0 ? new Intl.NumberFormat('en-US', {
                           style: 'currency',
                           currency: 'USD'
                         }).format(transaction.deposit) : '-'}
                       </span>
                     </TableCell>
                     <TableCell>
                       <span className={transaction.withdrawal > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}>
                         {transaction.withdrawal > 0 ? new Intl.NumberFormat('en-US', {
                           style: 'currency',
                           currency: 'USD'
                         }).format(transaction.withdrawal) : '-'}
                       </span>
                     </TableCell>
                     <TableCell>{transaction.account_number}</TableCell>
                     <TableCell>
                       <div className="flex space-x-2">
                         <div className="relative">
                           <button
                             onMouseEnter={() => setHoveredTransaction(transaction.id)}
                             onMouseLeave={() => setHoveredTransaction(null)}
                             className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all duration-200"
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
                         <button
                           onClick={() => handleDeleteTransaction(transaction.id)}
                           className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all duration-200"
                           title="Delete Transaction"
                         >
                           <Trash2 className="w-4 h-4 text-red-500" />
                         </button>
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
      </div>

      {/* Modals */}
             <BankTransactionUploadModal
         isOpen={showUploadModal}
         onClose={() => setShowUploadModal(false)}
         onAlert={onAlert}
         onSuccess={fetchTransactions}
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
        onSave={fetchTransactions}
      />

      <BankTransactionEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onAlert={onAlert}
        onSave={fetchTransactions}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default BankTransactions;