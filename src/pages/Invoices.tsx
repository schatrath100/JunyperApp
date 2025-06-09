import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

interface Invoice {
  id: number;
  Invoice_Number: string;
  Invoice_Date: string;
  Description: string;
  Amount: number;
  Status: string;
  Customer: {
    Customer_name: string;
  };
}

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchInvoices = async () => {
    try {
      console.log('Fetching invoices with search query:', searchQuery);
      setLoading(true);
      setError(null);

      let query = supabase
        .from('Invoice')
        .select('*, Customer(Customer_name)', { count: 'exact' });

      // Add search filter if searchQuery exists
      if (searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        query = query.or(
          `Customer.Customer_name.ilike.${searchTerm},Description.ilike.${searchTerm}`
        );
      }

      // Add pagination
      const start = (currentPage - 1) * itemsPerPage;
      query = query.range(start, start + itemsPerPage - 1);

      const { data, error, count } = await query
        .order('Invoice_Date', { ascending: false });

      if (error) throw error;

      console.log('Search results:', {
        query: searchQuery,
        results: data?.length || 0,
        total: count
      });
      
      setInvoices(data || []);
      setTotalItems(count || 0);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  // Add debounce to search to prevent too many requests
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Search query changed:', searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
      fetchInvoices();
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <button
            onClick={fetchInvoices}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={loading || showDeleteConfirm}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by customer or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Invoices
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your customer invoices here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoices; 