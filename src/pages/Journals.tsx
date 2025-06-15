import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, FileText, FileSpreadsheet, Search } from 'lucide-react';
import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import Button from '../components/Button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Transaction {
  id: number;
  account_id: number;
  account_name: string;
  credit_amount: number;
  debit_amount: number;
  invoice_id: number;
  description: string;
  transaction_date: string;
  Status: string;
  row_num?: number;
}

const Journals: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { sortedItems: sortedTransactions, sortConfig, requestSort } = useTableSort(
    transactions.filter(transaction => {
      const searchLower = searchQuery.toLowerCase();
      return (
        transaction.account_name.toLowerCase().includes(searchLower) ||
        transaction.description.toLowerCase().includes(searchLower) ||
        (transaction.Status || 'Pending').toLowerCase().includes(searchLower)
      );
    }),
    { key: 'transaction_date', direction: 'desc' }
  );

  // Calculate pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = sortedTransactions.slice(startIndex, endIndex);

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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to view transactions');
      }

      // Fetch transactions
      const { data: transactions, error: transactionError } = await supabase
        .from('Transaction')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (transactionError) throw transactionError;

      if (!transactions || transactions.length === 0) {
        setTransactions([]);
        return;
      }

      // Get unique account IDs
      const accountIds = [...new Set(transactions.map(t => t.account_id))];

      // Fetch account names from both userDefinedAccounts and systemAccounts
      const [userAccountsResult, systemAccountsResult] = await Promise.all([
        supabase
          .from('userDefinedAccounts')
          .select('id, account_name')
          .in('id', accountIds),
        supabase
          .from('systemAccounts')
          .select('id, account_name')
          .in('id', accountIds)
      ]);

      if (userAccountsResult.error) throw userAccountsResult.error;
      if (systemAccountsResult.error) throw systemAccountsResult.error;

      // Combine account data
      const allAccounts = [
        ...(userAccountsResult.data || []),
        ...(systemAccountsResult.data || [])
      ];

      // Create account lookup map
      const accountMap = new Map(allAccounts.map(acc => [acc.id, acc.account_name]));

      // Transform the data to include account_name
      const transformedData = transactions.map(transaction => ({
        ...transaction,
        account_name: accountMap.get(transaction.account_id) || 'Unknown Account'
      }));

      setTransactions(transformedData);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Journal Entries', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

    // Prepare table data
    const tableData = sortedTransactions.map(t => [
      `#${t.id}`,
      new Date(t.transaction_date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      }),
      t.account_name,
      t.description,
      t.debit_amount ? `$${t.debit_amount.toFixed(2)}` : '-',
      t.credit_amount ? `$${t.credit_amount.toFixed(2)}` : '-',
      t.invoice_id ? `#${t.invoice_id}` : '-',
      t.row_num || '-'
    ]);

    // Generate table
    autoTable(doc, {
      head: [['ID', 'Date', 'Account', 'Description', 'Debit', 'Credit', 'Invoice #', 'Row #']],
      body: tableData,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      columnStyles: {
        1: { cellWidth: 40 } // Make the date column wider
      }
    });

    // Save PDF
    doc.save('journal-entries.pdf');
  };

  const exportToExcel = () => {
    // Prepare data
    const data = sortedTransactions.map(t => ({
      'ID': `#${t.id}`,
      'Date': new Date(t.transaction_date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      }),
      'Account': t.account_name,
      'Description': t.description,
      'Debit': t.debit_amount || '',
      'Credit': t.credit_amount || '',
      'Invoice #': t.invoice_id ? `#${t.invoice_id}` : '',
      'Row #': t.row_num || ''
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Journal Entries');

    // Save file
    XLSX.writeFile(wb, 'journal-entries.xlsx');
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="p-6 pr-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal Entries</h1>
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
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Enhanced Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 mr-8">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                <TableHead 
                  onClick={() => requestSort('id')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-20 text-center font-semibold"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>ID</span>
                    {sortConfig?.key === 'id' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('transaction_date')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-48 text-left font-semibold"
                >
                  <div className="flex items-center space-x-2">
                    <span>Date</span>
                    {sortConfig?.key === 'transaction_date' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('account_name')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-40 text-left font-semibold"
                >
                  <div className="flex items-center space-x-2">
                    <span>Account</span>
                    {sortConfig?.key === 'account_name' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('description')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-64 text-left font-semibold"
                >
                  <div className="flex items-center space-x-2">
                    <span>Description</span>
                    {sortConfig?.key === 'description' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('Status')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-28 text-center font-semibold"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Status</span>
                    {sortConfig?.key === 'Status' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('debit_amount')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-32 text-right font-semibold"
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Debit</span>
                    {sortConfig?.key === 'debit_amount' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  onClick={() => requestSort('credit_amount')} 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-32 text-right font-semibold"
                >
                  <div className="flex items-center justify-end space-x-2">
                    <span>Credit</span>
                    {sortConfig?.key === 'credit_amount' && (
                      <span className="text-blue-600 dark:text-blue-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-24 text-center font-semibold">Invoice #</TableHead>
                <TableHead className="w-20 text-center font-semibold">Row #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
                      <p className="text-gray-500 dark:text-gray-400">Loading journal entries...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-gray-900 dark:text-gray-100 font-medium">No journal entries found</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                          {searchQuery ? 'Try adjusting your search terms' : 'Journal entries will appear here when transactions are created'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100 w-20 text-center">
                      #{transaction.id}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300 w-48">
                      <div className="text-sm">
                        {new Date(transaction.transaction_date).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                          timeZone: 'UTC'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300 w-40">
                      <div className="truncate" title={transaction.account_name}>
                        {transaction.account_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-300 w-64">
                      <div className="truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                    </TableCell>
                    <TableCell className="w-28 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.Status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400' :
                        transaction.Status === 'Overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400' :
                        transaction.Status === 'Cancelled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400' :
                        transaction.Status === 'Partially Paid' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'
                      }`}>
                        {transaction.Status || 'Pending'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-gray-600 dark:text-gray-300 w-32">
                      {transaction.debit_amount ? (
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(transaction.debit_amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-gray-600 dark:text-gray-300 w-32">
                      {transaction.credit_amount ? (
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(transaction.credit_amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-gray-600 dark:text-gray-300 w-24">
                      {transaction.invoice_id ? (
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          #{transaction.invoice_id}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-gray-600 dark:text-gray-300 w-20">
                      {transaction.row_num ? (
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {transaction.row_num}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Pagination */}
        {transactions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing <span className="font-medium text-gray-900 dark:text-gray-100">
                  {startIndex + 1}
                </span> to <span className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.min(endIndex, sortedTransactions.length)}
                </span> of <span className="font-medium text-gray-900 dark:text-gray-100">
                  {sortedTransactions.length}
                </span> entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm"
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
                      disabled={typeof page !== 'number'}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-sm'
                          : typeof page === 'number'
                          ? 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          : 'text-gray-400 dark:text-gray-500 cursor-default'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Journals;