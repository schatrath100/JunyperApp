import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Trash2, Pencil } from 'lucide-react';
import Button from '../components/Button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '../components/ui/table';
import FilterableTableHead from '../components/FilterableTableHead';

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

const BankTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

      let query = supabase
        .from('bank_transactions')
        .select('*');

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
        query = query.gte('amount', parseFloat(filters.amountMin));
      }
      if (filters.accountNumber) {
        query = query.eq('account_number', filters.accountNumber);
      }
      if (filters.type) {
        query = query.eq('credit_debit_indicator', filters.type);
      }

      // Add order by
      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
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

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  return (
    <div className="p-6">
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
                    <button className="text-blue-600 hover:text-blue-800">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BankTransactions;