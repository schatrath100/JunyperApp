import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Trash2, Pencil, Paperclip } from 'lucide-react';
import Button from '../components/Button';
import InvoiceModal from '../components/InvoiceModal';
import InvoiceStatusModal from '../components/InvoiceStatusModal';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const INVOICE_STATUS_FILTERS = [
  { value: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400' },
  { value: 'Paid', color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400' },
  { value: 'Partially Paid', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400' },
  { value: 'Overdue', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400' },
  { value: 'Cancelled', color: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-400' }
];

interface SalesInvoice {
  id: number;
  InvoiceDate: string;
  Customer_name: string;
  Description?: string;
  InvoiceAmount?: number;
  Status: string;
  OutStandingAmount: number;
  attachment_path?: string | null;
}

const Sales: React.FC = () => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Pending');
  const { sortedItems: sortedInvoices, sortConfig, requestSort } = useTableSort(
    invoices.filter(invoice => invoice.Status === selectedStatus),
    { key: 'InvoiceDate', direction: 'desc' }
  );

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('SalesInvoice')
        .select('*')
        .order('InvoiceDate', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleRowSelect = (id: number) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedRows(
      selectedRows.length === invoices.length
        ? []
        : invoices.map(invoice => invoice.id)
    );
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('SalesInvoice')
        .delete()
        .in('id', selectedRows);

      if (deleteError) throw deleteError;

      setSelectedRows([]);
      setShowDeleteConfirm(false);
      await fetchInvoices();
    } catch (err) {
      console.error('Error deleting invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete invoices');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Invoices</h1>
          <button
            onClick={fetchInvoices}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {selectedRows.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Delete selected invoices"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          {selectedRows.length > 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {selectedRows.length} selected
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="default"
            className="bg-black hover:bg-black/90 text-white"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Invoice
          </Button>
        </div>
      </div>

      <div className="mb-6 flex space-x-2">
        {INVOICE_STATUS_FILTERS.map((status) => (
          <button
            key={status.value}
            onClick={() => setSelectedStatus(status.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === status.value
                ? status.color
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {status.value}
          </button>
        ))}
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
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    checked={selectedRows.length === invoices.length && invoices.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <TableHead onClick={() => requestSort('id')} className="cursor-pointer">
                  Invoice No.
                </TableHead>
                <TableHead onClick={() => requestSort('InvoiceDate')} className="cursor-pointer">
                  Date
                </TableHead>
                <TableHead onClick={() => requestSort('Customer_name')} className="cursor-pointer">
                  Customer
                </TableHead>
                <TableHead onClick={() => requestSort('OutstandingAmount')} className="cursor-pointer">
                  Outstanding Amount
                </TableHead>
                <TableHead>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => (
                <TableRow 
                  key={invoice.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedRows.includes(invoice.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.includes(invoice.id)}
                      onChange={() => handleRowSelect(invoice.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    #{invoice.id}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.InvoiceDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {invoice.Customer_name}
                  </TableCell>
                  <TableCell>
                    {invoice.OutstandingAmount ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(invoice.OutstandingAmount) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowStatusModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        title="Edit invoice status"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {invoice.attachment_path && invoice.attachment_path.trim() && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowPreviewModal(true);
                          }}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                          title="View attachment"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchInvoices}
      />
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete {selectedRows.length} selected invoice{selectedRows.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 !bg-red-500 hover:!bg-red-600"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {selectedInvoice && (
        <>
          <InvoiceStatusModal
            isOpen={showStatusModal}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedInvoice(null);
            }}
            invoice={selectedInvoice}
            onSave={fetchInvoices}
          />
          <InvoicePreviewModal
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedInvoice(null);
            }}
            invoice={selectedInvoice}
          />
        </>
      )}
    </div>
  );
};

export default Sales;