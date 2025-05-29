import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface BankTransactionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAlert?: (message: string, type: Alert['type']) => void;
}

interface TransactionRow {
  [key: string]: any;
  date?: string;
  Date?: string;
  amount?: number;
  Amount?: number;
  account_number?: string | number;
  'Account Number'?: string | number;
  bank_name?: string;
  'Bank Name'?: string;
  description?: string;
  Description?: string;
  credit_debit_indicator?: string;
  'Credit/Debit'?: string;
}

const BankTransactionUploadModal: React.FC<BankTransactionUploadModalProps> = ({ isOpen, onClose, onSuccess, onAlert }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TransactionRow[]>([]);

  const columnMappings = {
    date: ['date', 'Date'],
    amount: ['amount', 'Amount'],
    account_number: ['account_number', 'Account Number'],
    bank_name: ['bank_name', 'Bank Name'],
    description: ['description', 'Description'],
    credit_debit: ['credit_debit_indicator', 'Credit/Debit']
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
    
    Object.values(columnMappings).forEach(columnOptions => {
      const hasColumn = columnOptions.some(col => headers.includes(col));
      if (!hasColumn) {
        missingColumns.push(columnOptions.join(' or '));
      }
    });

    return missingColumns;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      setError(null);
      setFile(selectedFile);

      // Read file
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<TransactionRow>(worksheet);

      if (jsonData.length === 0) {
        throw new Error('The file appears to be empty. Please check the file contents.');
      }

      // Validate columns
      const headers = Object.keys(jsonData[0] || {});
      const missingColumns = validateColumns(headers);

      if (missingColumns.length > 0) {
        throw new Error(
          `Missing required columns: ${missingColumns.join(', ')}\n\n` +
          `Found columns: ${headers.join(', ')}\n\n` +
          `Please ensure your file has all the required columns.`
        );
      }

      setPreview(jsonData.slice(0, 5)); // Show first 5 rows as preview
    } catch (err) {
      console.error('Error reading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setFile(null);
      setPreview([]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<TransactionRow>(worksheet);

      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Transform and validate data
      const transactions = jsonData.map(row => ({
        date: new Date(findColumnValue(row, columnMappings.date)).toISOString().split('T')[0],
        amount: Math.abs(Number(findColumnValue(row, columnMappings.amount))),
        account_number: Number(findColumnValue(row, columnMappings.account_number)),
        bank_name: findColumnValue(row, columnMappings.bank_name),
        description: findColumnValue(row, columnMappings.description),
        credit_debit_indicator: findColumnValue(row, columnMappings.credit_debit).toLowerCase() === 'credit' ? 'credit' : 'debit',
        user_id: user.id
      }));

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload Bank Transactions
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 whitespace-pre-line">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload CSV or Excel File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  CSV or Excel files only
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Required columns: Date, Amount, Account Number, Bank Name, Description, Credit/Debit
                </p>
              </div>
            </div>
          </div>

          {preview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview (first 5 rows)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {Object.keys(preview[0]).map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {preview.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, i) => (
                          <td
                            key={i}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
                          >
                            {value?.toString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-black hover:bg-black/90 text-white"
              onClick={handleSubmit}
              disabled={!file || loading}
              icon={<Upload className="w-4 h-4" />}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankTransactionUploadModal;