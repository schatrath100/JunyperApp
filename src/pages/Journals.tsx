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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journals</h1>
          <button
            onClick={fetchTransactions}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Account, Description, or Status..."
              className="pl-10 pr-4 py-2 w-80 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-3">
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
                <TableHead onClick={() => requestSort('id')} className="cursor-pointer">
                  ID
                </TableHead>
                <TableHead onClick={() => requestSort('transaction_date')} className="cursor-pointer">
                  Date
                </TableHead>
                <TableHead onClick={() => requestSort('account_name')} className="cursor-pointer">
                  Account
                </TableHead>
                <TableHead onClick={() => requestSort('description')} className="cursor-pointer">
                  Description
                </TableHead>
                <TableHead onClick={() => requestSort('Status')} className="cursor-pointer">
                  Status
                </TableHead>
                <TableHead onClick={() => requestSort('debit_amount')} className="cursor-pointer text-right">
                  Debit
                </TableHead>
                <TableHead onClick={() => requestSort('credit_amount')} className="cursor-pointer text-right">
                  Credit
                </TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Row #</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    #{transaction.id}
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.transaction_date).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                      timeZone: 'UTC'
                    })}
                  </TableCell>
                  <TableCell>
                    {transaction.account_name}
                  </TableCell>
                  <TableCell>
                    {transaction.description}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.Status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      transaction.Status === 'Overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      transaction.Status === 'Cancelled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                      transaction.Status === 'Partially Paid' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {transaction.Status || 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.debit_amount ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(transaction.debit_amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.credit_amount ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(transaction.credit_amount) : '-'}
                  </TableCell>
                  <TableCell>
                    {transaction.invoice_id ? `#${transaction.invoice_id}` : '-'}
                  </TableCell>
                  <TableCell>
                    {transaction.row_num || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {transactions.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedTransactions.length)} of {sortedTransactions.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Journals;