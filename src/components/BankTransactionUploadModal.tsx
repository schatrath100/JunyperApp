import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface BankTransactionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAlert?: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void;
}

interface TransactionRow {
  [key: string]: any;
  date?: string;
  Date?: string;
  deposit?: number;
  Deposit?: number;
  withdrawal?: number;
  Withdrawal?: number;
  account_number?: string | number;
  'Account Number'?: string | number;
  bank_name?: string;
  'Bank Name'?: string;
  description?: string;
  Description?: string;
}

const BankTransactionUploadModal: React.FC<BankTransactionUploadModalProps> = ({ isOpen, onClose, onSuccess, onAlert }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TransactionRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 3; // Reduced from 5 to 3 for more compact preview

  const columnMappings = {
    date: ['date', 'Date', 'DATE', 'Transaction Date', 'TRANSACTION DATE'],
    account_number: ['account number', 'Account Number', 'ACCOUNT NUMBER', 'account_number', 'Account_Number', 'Account', 'ACCOUNT'],
    bank_name: ['bank name', 'Bank Name', 'BANK NAME', 'bank_name', 'Bank_Name', 'Bank', 'BANK'],
    description: ['description', 'Description', 'DESCRIPTION', 'Transaction Description', 'TRANSACTION DESCRIPTION', 'Details', 'DETAILS'],
    deposit: ['deposit', 'Deposit', 'DEPOSIT', 'Deposits', 'DEPOSITS', 'Credit', 'CREDIT'],
    withdrawal: ['withdrawal', 'Withdrawal', 'WITHDRAWAL', 'Withdrawals', 'WITHDRAWALS', 'Debit', 'DEBIT']
  };

  const findColumnValue = (row: TransactionRow, columnOptions: string[]): any => {
    for (const option of columnOptions) {
      if (row[option] !== undefined) {
        return row[option];
      }
    }
    return null;
  };

  const validateColumns = (headers: string[]): string[] => {
    const missingColumns: string[] = [];
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    console.log('Normalized headers:', normalizedHeaders);
    
    // Check headers in the required order
    const requiredColumns = ['date', 'account_number', 'bank_name', 'description', 'deposit', 'withdrawal'];
    const foundHeaders = requiredColumns.map(required => {
      const columnOptions = columnMappings[required as keyof typeof columnMappings];
      console.log(`Checking ${required} with options:`, columnOptions);
      
      const hasColumn = columnOptions.some(col => {
        const normalizedCol = col.toLowerCase().trim();
        const found = normalizedHeaders.includes(normalizedCol);
        console.log(`Checking "${normalizedCol}" in headers: ${found}`);
        return found;
      });
      
      if (!hasColumn) {
        missingColumns.push(required.replace('_', ' '));
      }
      return hasColumn;
    });

    console.log('Missing columns:', missingColumns);
    console.log('Found headers:', foundHeaders);

    // If any headers are missing, return the missing ones
    if (missingColumns.length > 0) {
      return missingColumns;
    }

    // If all headers are present but in wrong order, return the correct order
    if (!foundHeaders.every(Boolean)) {
      return ['Headers must be in this order: Date, Account Number, Bank Name, Description, Deposit, Withdrawal'];
    }

    return [];
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      setError(null);
      setFile(selectedFile);
      setCurrentPage(1);

      // Read file
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Get the range of the worksheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Get headers from the first row
      const headers: string[] = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        if (cell && cell.v) {
          headers.push(String(cell.v).trim());
        }
      }

      console.log('Headers from first row:', headers);
      
      // Read data with proper type conversion, skipping the header row
      const jsonData = XLSX.utils.sheet_to_json<TransactionRow>(worksheet, {
        header: headers,
        raw: false,
        defval: null,
        dateNF: 'yyyy-mm-dd',
        range: { s: { r: 1, c: 0 }, e: range.e } // Start from row 1 (second row)
      });

      if (jsonData.length === 0) {
        throw new Error('The file appears to be empty. Please check the file contents.');
      }

      // Validate columns
      console.log('Original headers from file:', headers);
      const missingColumns = validateColumns(headers);

      if (missingColumns.length > 0) {
        throw new Error(
          `Missing required columns: ${missingColumns.join(', ')}\n\n` +
          `Found columns: ${headers.join(', ')}\n\n` +
          `Please ensure your file has all the required columns.`
        );
      }

      // Process and validate the data
      const processedData = jsonData.map(row => {
        // Find the correct column names regardless of case
        const dateCol = Object.keys(row).find(key => 
          columnMappings.date.includes(key.toLowerCase())
        );
        const depositCol = Object.keys(row).find(key => 
          columnMappings.deposit.includes(key.toLowerCase())
        );
        const withdrawalCol = Object.keys(row).find(key => 
          columnMappings.withdrawal.includes(key.toLowerCase())
        );
        const accountCol = Object.keys(row).find(key => 
          columnMappings.account_number.includes(key.toLowerCase())
        );
        const bankCol = Object.keys(row).find(key => 
          columnMappings.bank_name.includes(key.toLowerCase())
        );
        const descCol = Object.keys(row).find(key => 
          columnMappings.description.includes(key.toLowerCase())
        );

        // Convert values to proper types
        const deposit = depositCol ? Number(row[depositCol]) || 0 : 0;
        const withdrawal = withdrawalCol ? Number(row[withdrawalCol]) || 0 : 0;

        return {
          date: dateCol ? row[dateCol] : '',
          deposit,
          withdrawal,
          account_number: accountCol ? String(row[accountCol]).trim() : '',
          bank_name: bankCol ? String(row[bankCol]).trim() : '',
          description: descCol ? String(row[descCol]).trim() : ''
        };
      });

      setPreview(processedData);
    } catch (err) {
      console.error('Error reading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setFile(null);
      setPreview([]);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(preview.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = preview.slice(startIndex, endIndex);

  const handleSubmit = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Get the range of the worksheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Get headers from the first row
      const headers: string[] = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        if (cell && cell.v) {
          headers.push(String(cell.v).trim());
        }
      }

      // Read data starting from the second row (skip headers)
      const jsonData = XLSX.utils.sheet_to_json<TransactionRow>(worksheet, {
        header: headers,
        raw: false,
        defval: null,
        dateNF: 'yyyy-mm-dd',
        range: { s: { r: 1, c: 0 }, e: range.e } // Start from row 1 (second row)
      });

      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Process and validate the data
      const transactions = jsonData.map(row => {
        // Find the correct column names regardless of case
        const dateCol = Object.keys(row).find(key => 
          columnMappings.date.includes(key.toLowerCase())
        );
        const depositCol = Object.keys(row).find(key => 
          columnMappings.deposit.includes(key.toLowerCase())
        );
        const withdrawalCol = Object.keys(row).find(key => 
          columnMappings.withdrawal.includes(key.toLowerCase())
        );
        const accountCol = Object.keys(row).find(key => 
          columnMappings.account_number.includes(key.toLowerCase())
        );
        const bankCol = Object.keys(row).find(key => 
          columnMappings.bank_name.includes(key.toLowerCase())
        );
        const descCol = Object.keys(row).find(key => 
          columnMappings.description.includes(key.toLowerCase())
        );

        // Convert values to proper types
        const deposit = depositCol ? Number(row[depositCol]) || 0 : 0;
        const withdrawal = withdrawalCol ? Number(row[withdrawalCol]) || 0 : 0;

        // Validate that both deposit and withdrawal are not present
        if (deposit > 0 && withdrawal > 0) {
          throw new Error(`Row with date ${dateCol ? row[dateCol] : 'unknown'} has both deposit and withdrawal amounts. Please specify only one.`);
        }

        // Parse and format the date
        let dateValue = dateCol ? row[dateCol] : null;
        if (!dateValue) {
          throw new Error('Date is required for each transaction');
        }

        // Try to parse the date string
        const parsedDate = new Date(dateValue);
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date format: ${dateValue}`);
        }

        // Create a new date object with the date parts only
        const year = parsedDate.getFullYear();
        const month = parsedDate.getMonth();
        const day = parsedDate.getDate();
        
        // Create a new date at midnight UTC
        const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

        return {
          date: utcDate.toISOString(), // This will be in UTC
          deposit,
          withdrawal,
          account_number: Number(accountCol ? row[accountCol] : 0),
          bank_name: bankCol ? String(row[bankCol]).trim() : '',
          description: descCol ? String(row[descCol]).trim() : '',
          user_id: user.id,
          transaction_source: 'upload',
        transaction_status: 'New'
        };
      });

      // Insert transactions
      const { error: insertError } = await supabase
        .from('bank_transactions')
        .insert(transactions);

      if (insertError) throw insertError;

      onSuccess();
      onAlert?.('Bank transactions uploaded successfully', 'success');
      onClose();
    } catch (err) {
      console.error('Error uploading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload transactions');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upload Bank Transactions
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 whitespace-pre-line text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload CSV or Excel File
            </label>
            <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg">
                              <div className="space-y-1 text-center">
                  <FileSpreadsheet className="mx-auto h-8 w-8 text-gray-400" />
                  <div className="flex justify-center text-sm text-gray-600 dark:text-gray-400">
                    <label className="relative cursor-pointer rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Required columns in order: Date, Account Number, Bank Name, Description, Deposit, Withdrawal
                </p>
              </div>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview ({preview.length} records)
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
              <div className="overflow-x-auto max-h-60 border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Bank
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Deposit
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Withdrawal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentRows.map((row, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row.date}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row.account_number}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 truncate max-w-24">
                          {row.bank_name}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 truncate max-w-32">
                          {row.description}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row.deposit}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row.withdrawal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-3">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex space-x-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-black hover:bg-black/90 text-white"
              onClick={handleSubmit}
              disabled={!file || loading}
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankTransactionUploadModal;
