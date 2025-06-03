import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, FileText, FileSpreadsheet } from 'lucide-react';
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
}

const Journals: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const { sortedItems: sortedTransactions, sortConfig, requestSort } = useTableSort(
    transactions,
    { key: 'transaction_date', direction: 'desc' }
  );

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch transactions with account names using proper join syntax
      const { data, error: transactionError } = await supabase
        .from('Transaction')
        .select(`
          *,
          Account (account_name)
        `)
        .order('transaction_date', { ascending: false });

      if (transactionError) throw transactionError;

      // Transform the data to include account_name
      const transformedData = data?.map(transaction => ({
        ...transaction,
        account_name: transaction.Account?.account_name || 'Unknown Account'
      }));

      setTransactions(transformedData || []);
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
      new Date(t.transaction_date).toLocaleDateString(),
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
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Save PDF
    doc.save('journal-entries.pdf');
  };

  const exportToExcel = () => {
    // Prepare data
    const data = sortedTransactions.map(t => ({
      'ID': `#${t.id}`,
      'Date': new Date(t.transaction_date).toLocaleDateString(),
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
              {sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    #{transaction.id}
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.transaction_date).toLocaleDateString()}
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
                  <TableCell colSpan={8} className="text-center">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Journals;
