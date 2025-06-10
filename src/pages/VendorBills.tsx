import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Trash2, Pencil, Paperclip, FileText, FileSpreadsheet } from 'lucide-react';
import Button from '../components/Button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import VendorBillModal from '../components/VendorBillModal';
import VendorBillPreviewModal from '../components/VendorBillPreviewModal';
import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert } from '../components/Alert';

interface VendorBill {
  id: number;
  Date: string;
  Vendor_name: string;
  Description?: string;
  Amount: number;
  Status: string;
  attachment_path?: string | null;
}

interface VendorBillsProps {
  onAlert?: (message: string, type: Alert['type']) => void;
}

const BILL_STATUS_FILTERS = [
  { value: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400' },
  { value: 'Paid', color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400' },
  { value: 'Overdue', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400' },
  { value: 'Cancelled', color: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-400' }
];

const VendorBills: React.FC<VendorBillsProps> = ({ onAlert }) => {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<VendorBill | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Pending');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null);
  const { sortedItems: sortedBills, sortConfig, requestSort } = useTableSort(
    bills.filter(bill => bill.Status === selectedStatus),
    { key: 'Date', direction: 'desc' }
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Vendor Bills', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

    // Prepare table data
    const tableData = sortedBills.map(bill => [
      `#${bill.id}`,
      new Date(bill.Date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      bill.Vendor_name,
      bill.Description || '-',
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(bill.Amount),
      bill.Status
    ]);

    // Generate table
    autoTable(doc, {
      head: [['Bill #', 'Date', 'Vendor', 'Description', 'Amount', 'Status']],
      body: tableData,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Save PDF
    doc.save('vendor-bills.pdf');
  };

  const exportToExcel = () => {
    // Prepare data
    const data = sortedBills.map(bill => ({
      'Bill #': bill.id,
      'Date': new Date(bill.Date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      'Vendor': bill.Vendor_name,
      'Description': bill.Description || '-',
      'Amount': bill.Amount,
      'Status': bill.Status
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Bills');

    // Save file
    XLSX.writeFile(wb, 'vendor-bills.xlsx');
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('VendorInvoice')
        .select('*')
        .order('Date', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
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
      selectedRows.length === bills.length
        ? []
        : bills.map(bill => bill.id)
    );
  };

  const handleEdit = (bill: VendorBill) => {
    setEditingBill(bill);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('VendorInvoice')
        .delete()
        .in('id', selectedRows);

      if (deleteError) throw deleteError;

      setSelectedRows([]);
      setShowDeleteConfirm(false);
      await fetchBills();
    } catch (err) {
      console.error('Error deleting bills:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete bills');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Bills</h1>
          <button
            onClick={fetchBills}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {selectedRows.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Delete selected bills"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {selectedRows.length} selected
          </div>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white transform transition-all duration-200 hover:scale-105 hover:shadow-lg hover:-translate-y-0.5"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingBill(null);
              setIsModalOpen(true);
            }}
          >
            Add Vendor Bill
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

      <div className="mb-6 flex space-x-2">
        {BILL_STATUS_FILTERS.map((status) => (
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
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    checked={selectedRows.length === bills.length && bills.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead onClick={() => requestSort('id')} className="cursor-pointer">
                  Bill No.
                </TableHead>
                <TableHead onClick={() => requestSort('Date')} className="cursor-pointer">
                  Date
                </TableHead>
                <TableHead onClick={() => requestSort('Vendor_name')} className="cursor-pointer">
                  Vendor
                </TableHead>
                <TableHead onClick={() => requestSort('Description')} className="cursor-pointer">
                  Description
                </TableHead>
                <TableHead onClick={() => requestSort('Amount')} className="cursor-pointer">
                  Amount
                </TableHead>
                <TableHead onClick={() => requestSort('Status')} className="cursor-pointer">
                  Status
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBills.map((bill) => (
                <TableRow 
                  key={bill.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedRows.includes(bill.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.includes(bill.id)}
                      onChange={() => handleRowSelect(bill.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    #{bill.id}
                  </TableCell>
                  <TableCell>
                    {new Date(bill.Date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>
                    {bill.Vendor_name}
                  </TableCell>
                  <TableCell>
                    {bill.Description || '-'}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(bill.Amount)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      bill.Status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      bill.Status === 'Overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      bill.Status === 'Cancelled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {bill.Status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(bill)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="Edit bill"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {bill.attachment_path && (
                          <button
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowPreviewModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                            title="View attachment"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {bills.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No bills found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <VendorBillModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBill(null);
        }}
        bill={editingBill}
        onSave={fetchBills}
        onAlert={onAlert}
      />
      
      {selectedBill && (
        <VendorBillPreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedBill(null);
          }}
          bill={selectedBill}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete {selectedRows.length} selected bill{selectedRows.length > 1 ? 's' : ''}? 
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
    </div>
  );
};

export default VendorBills;