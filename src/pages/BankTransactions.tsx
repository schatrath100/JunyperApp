import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Upload, Download, Search } from 'lucide-react';
import Button from '../components/Button';
import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import * as XLSX from 'xlsx';
import { parse, isValid, format } from 'date-fns';

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
  dateTo: string;
  bankName: string;
  accountNumber: string;
  amountMin: string;
  amountMax: string;
  type: string;
}

const BankTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    bankName: '',
    accountNumber: '',
    amountMin: '',
    amountMax: '',
    type: ''
  });

  const { sortedItems: sortedTransactions, sortConfig, requestSort } = useTableSort(
    transactions,
    { key: 'date', direction: 'desc' }
  );

  const parseDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;

    if (!isNaN(Number(dateStr))) {
      const excelDate = new Date((Number(dateStr) - 25569) * 86400 * 1000);
      if (isValid(excelDate)) {
        return format(excelDate, 'yyyy-MM-dd');
      }
    }

    if (dateStr.match(/^\d{4}-\d{2}-\d{2}T/)) {
      const date = new Date(dateStr);
      if (isValid(date)) {
        return format(date, 'yyyy-MM-dd');
      }
    }

    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'dd/MM/yyyy',
      'MM-dd-yyyy',
      'dd-MM-yyyy',
      'yyyy/MM/dd'
    ];

    for (const dateFormat of formats) {
      const parsedDate = parse(dateStr, dateFormat, new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, 'yyyy-MM-dd');
      }
    }

    return null;
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('bank_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (filters.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('date', filters.dateTo);
      }
      if (filters.bankName) {
        query = query.ilike('bank_name', `%${filters.bankName}%`);
      }
      if (filters.accountNumber) {
        query = query.eq('account_number', filters.accountNumber);
      }
      if (filters.amountMin) {
        query = query.gte('amount', parseFloat(filters.amountMin));
      }
      if (filters.amountMax) {
        query = query.lte('amount', parseFloat(filters.amountMax));
      }
      if (filters.type) {
        query = query.eq('credit_debit_indicator', filters.type);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const validateHeaders = (headers: string[]): string | null => {
    const requiredColumns = ['date', 'amount', 'account_number'];
    const missingColumns = requiredColumns.filter(col => 
      !headers.some(header => 
        header.toLowerCase() === col.toLowerCase() ||
        header.toLowerCase().replace(/[^a-z0-9]/g, '') === col.toLowerCase()
      )
    );

    if (missingColumns.length > 0) {
      return `Missing required columns: ${missingColumns.join(', ')}. Please ensure your file has these columns.`;
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Validate headers
          if (jsonData.length === 0) {
            throw new Error('The file is empty');
          }

          const headers = (jsonData[0] as string[]).map(header => 
            header.toString().toLowerCase().trim()
          );
          const headerError = validateHeaders(headers);
          if (headerError) {
            throw new Error(headerError);
          }

          // Remove header row and process data
          const rows = XLSX.utils.sheet_to_json(worksheet);

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const validTransactions = [];
          const errors = [];

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
              // Handle both uppercase and lowercase column names
              const date = row.date || row.DATE;
              const description = row.description || row.DESCRIPTION || '';
              const amount = row.amount || row.AMOUNT;
              const bankName = (row.bank_name || row.BANK_NAME || '').toString().trim();
              const accountNumber = row.account_number || row.ACCOUNT_NUMBER;
              const creditDebitIndicator = row.credit_debit_indicator || row.CREDIT_DEBIT_INDICATOR;

              // Validate required fields with specific error messages
              if (!amount) {
                throw new Error(`Amount is required in row ${i + 2}`);
              }
              if (!accountNumber) {
                throw new Error(`Account number is required in row ${i + 2}`);
              }

              const parsedAccountNumber = parseInt(accountNumber);
              if (isNaN(parsedAccountNumber)) {
                throw new Error(`Invalid account number format in row ${i + 2}: ${accountNumber}`);
              }

              const parsedDate = parseDate(date);
              if (!parsedDate) {
                throw new Error(`Invalid date format in row ${i + 2}. Expected formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, or Excel date format`);
              }

              // Use a default bank name if none is provided
              const finalBankName = bankName || 'Unknown Bank';

              validTransactions.push({
                date: parsedDate,
                bank_name: finalBankName,
                description: description || 'No description',
                amount: parseFloat(amount),
                account_number: parsedAccountNumber,
                credit_debit_indicator: (creditDebitIndicator || 'debit').toLowerCase(),
                user_id: user.id
              });
            } catch (rowError) {
              errors.push(rowError.message);
            }
          }

          if (errors.length > 0) {
            throw new Error(`Validation errors found:\n${errors.join('\n')}`);
          }

          if (validTransactions.length === 0) {
            throw new Error('No valid transactions found in the file');
          }

          const { error: insertError } = await supabase
            .from('bank_transactions')
            .insert(validTransactions);

          if (insertError) throw insertError;

          setShowUploadModal(false);
          fetchTransactions();
        } catch (err) {
          console.error('Error processing file:', err);
          setError(err instanceof Error ? err.message : 'Failed to process file');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const exportToExcel = () => {
    const data = sortedTransactions.map(t => ({
      Date: new Date(t.date).toLocaleDateString(),
      'Bank Name': t.bank_name,
      Description: t.description,
      Amount: t.amount,
      'Account Number': t.account_number,
      Type: t.credit_debit_indicator
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Transactions');
    XLSX.writeFile(wb, 'bank-transactions.xlsx');
  };

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  return (
    <div className="p-8 font-inter">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Bank Transactions</h1>
          <button
            onClick={fetchTransactions}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={exportToExcel}
          >
            Export
          </Button>
          <Button
            variant="primary"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setShowUploadModal(true)}
          >
            Upload Transactions
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('date')} className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                  Date
                </TableHead>
                <TableHead onClick={() => requestSort('bank_name')} className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                  Bank Name
                </TableHead>
                <TableHead onClick={() => requestSort('description')} className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                  Description
                </TableHead>
                <TableHead onClick={() => requestSort('amount')} className="cursor-pointer text-right hover:text-gray-900 dark:hover:text-gray-100">
                  Amount
                </TableHead>
                <TableHead onClick={() => requestSort('account_number')} className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                  Account Number
                </TableHead>
                <TableHead>
                  Type
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {transaction.bank_name}
                  </TableCell>
                  <TableCell>
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={transaction.credit_debit_indicator === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {transaction.account_number}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.credit_debit_indicator === 'credit'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {transaction.credit_debit_indicator}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Upload Bank Transactions
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Upload a CSV or Excel file containing bank transactions. The file should have the following columns:
              <ul className="list-disc ml-6 mt-2">
                <li>date (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, or Excel date format)</li>
                <li>amount (required)</li>
                <li>account_number (required)</li>
                <li>bank_name (optional, defaults to "Unknown Bank")</li>
                <li>description (optional)</li>
                <li>credit_debit_indicator (optional, defaults to "debit")</li>
              </ul>
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="w-full mb-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankTransactions;