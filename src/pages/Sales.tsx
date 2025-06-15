import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw, Plus, Trash2, Pencil, Paperclip, FileText, FileSpreadsheet, Search } from 'lucide-react';
import Button from '../components/Button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import InvoiceModal from '../components/InvoiceModal';
import InvoiceStatusModal from '../components/InvoiceStatusModal';
import InvoicePreviewModal from '../components/InvoicePreviewModal';
import { useTableSort } from '../hooks/useTableSort';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import type { Alert } from '../components/Alert';

const INVOICE_STATUS_FILTERS = [
  { value: 'All', color: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-400' },
  { value: 'Paid', color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400' },
  { value: 'Partially Paid', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400' },
  { value: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-400' },
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
  OutstandingAmount: number;
  attachment_path?: string | null;
}

interface SalesProps {
  onAlert?: (message: string, type: Alert['type']) => void;
}

const Sales: React.FC<SalesProps> = ({ onAlert }) => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { sortedItems: sortedInvoices, sortConfig, requestSort } = useTableSort(
    invoices.filter(invoice => selectedStatus === 'All' || invoice.Status === selectedStatus),
    { key: 'InvoiceDate', direction: 'desc' }
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Sales Invoices', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

    // Prepare table data
    const tableData = sortedInvoices.map(invoice => [
      `#${invoice.id}`,
      new Date(invoice.InvoiceDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      invoice.Customer_name,
      invoice.Description || '-',
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(invoice.InvoiceAmount || 0),
      invoice.Status
    ]);

    // Generate table
    autoTable(doc, {
      head: [['Invoice #', 'Date', 'Customer', 'Description', 'Amount', 'Status']],
      body: tableData,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Save PDF
    doc.save('sales-invoices.pdf');
  };

  const exportToExcel = () => {
    // Prepare data
    const data = sortedInvoices.map(invoice => ({
      'Invoice #': invoice.id,
      'Date': new Date(invoice.InvoiceDate).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      'Customer': invoice.Customer_name,
      'Description': invoice.Description || '-',
      'Amount': invoice.InvoiceAmount || 0,
      'Outstanding': invoice.OutstandingAmount || 0,
      'Status': invoice.Status
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Invoices');

    // Save file
    XLSX.writeFile(wb, 'sales-invoices.xlsx');
  };

  const fetchInvoices = async () => {
    try {
      console.log('Fetching invoices with search query:', searchQuery);
      setLoading(true);
      setError(null);

      let query = supabase
        .from('SalesInvoice')
        .select('*');

      // Add search filter if searchQuery exists
      if (searchQuery.trim()) {
        const searchTerm = `%${searchQuery.trim()}%`;
        query = query.or(
          `Customer_name.ilike.${searchTerm},Description.ilike.${searchTerm}`
        );
      }

      // Add status filter only if not "All"
      if (selectedStatus !== 'All') {
        query = query.eq('Status', selectedStatus);
      }

      const { data, error } = await query
        .order('InvoiceDate', { ascending: false });

      if (error) throw error;
      
      console.log('Fetched invoices:', data);
      // Debug log for OutStandingAmount
      data?.forEach(invoice => {
        console.log(`Invoice ${invoice.id} OutStandingAmount:`, invoice.OutstandingAmount);
      });
      setInvoices(data || []);
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
      fetchInvoices();
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery, selectedStatus]);

  // Helper function to get status badge styling
  const getStatusBadgeStyle = (status: string) => {
    const statusFilter = INVOICE_STATUS_FILTERS.find(filter => filter.value === status);
    return statusFilter ? statusFilter.color : 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-400';
  };

  const getTabStyle = (status: string) => {
    const colorSchemes = {
      'All': {
        gradient: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
        hover: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        active: 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)',
        text: '#374151',
      },
      'Pending': {
        gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        hover: 'linear-gradient(135deg, #FDE68A 0%, #FCD34D 100%)',
        active: 'linear-gradient(135deg, #FCD34D 0%, #FBBF24 100%)',
        text: '#B45309',
      },
      'Paid': {
        gradient: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
        hover: 'linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)',
        active: 'linear-gradient(135deg, #86EFAC 0%, #4ADE80 100%)',
        text: '#15803D',
      },
      'Partially Paid': {
        gradient: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
        hover: 'linear-gradient(135deg, #BAE6FD 0%, #7DD3FC 100%)',
        active: 'linear-gradient(135deg, #7DD3FC 0%, #38BDF8 100%)',
        text: '#0369A1',
      },
      'Overdue': {
        gradient: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
        hover: 'linear-gradient(135deg, #FECACA 0%, #FCA5A5 100%)',
        active: 'linear-gradient(135deg, #FCA5A5 0%, #F87171 100%)',
        text: '#B91C1C',
      },
      'Cancelled': {
        gradient: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
        hover: 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)',
        active: 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)',
        text: '#4B5563',
      },
    };

    const scheme = colorSchemes[status as keyof typeof colorSchemes] || colorSchemes['All'];

    return {
      padding: '0.75rem 1.5rem',
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: selectedStatus === status ? 600 : 500,
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
      border: 'none',
      outline: 'none',
      background: selectedStatus === status ? scheme.active : scheme.gradient,
      color: selectedStatus === status ? scheme.text : '#4B5563',
      '&:hover': {
        background: scheme.hover,
        color: scheme.text,
      },
    };
  };

  return (
    <div className="p-6 pr-8">
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
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by customer or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Invoice
          </Button>
          <button
            onClick={exportToPDF}
            className="h-10 w-10 flex items-center justify-center text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Export to PDF"
          >
            <FileText className="w-5 h-5" />
          </button>
          <button
            onClick={exportToExcel}
            className="h-10 w-10 flex items-center justify-center text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-500 transition-colors rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Export to Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mb-6 flex space-x-2 overflow-x-auto pb-2">
        {INVOICE_STATUS_FILTERS.map((status) => (
          <button
            key={status.value}
            onClick={() => setSelectedStatus(status.value)}
            style={getTabStyle(status.value)}
            className={`capitalize ${
              selectedStatus === status.value ? 'shadow-md' : ''
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

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 mr-8">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('id')} className="cursor-pointer w-16 text-center">
                  Invoice No.
                </TableHead>
                <TableHead onClick={() => requestSort('InvoiceDate')} className="cursor-pointer w-20 text-center">
                  Date
                </TableHead>
                <TableHead onClick={() => requestSort('Customer_name')} className="cursor-pointer w-36 text-left">
                  Customer
                </TableHead>
                <TableHead onClick={() => requestSort('Description')} className="cursor-pointer w-32 text-left">
                  Description
                </TableHead>
                <TableHead onClick={() => requestSort('InvoiceAmount')} className="cursor-pointer w-32 text-right">
                  Invoice Amount
                </TableHead>
                <TableHead onClick={() => requestSort('OutstandingAmount')} className="cursor-pointer w-32 text-right">
                  Outstanding
                </TableHead>
                <TableHead onClick={() => requestSort('Status')} className="cursor-pointer w-28 text-center">
                  Status
                </TableHead>
                <TableHead className="w-16 text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => (
                <TableRow 
                  key={invoice.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <TableCell className="font-medium w-16 text-center">
                    #{invoice.id}
                  </TableCell>
                  <TableCell className="w-20 text-center whitespace-nowrap">
                    {new Date(invoice.InvoiceDate).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="w-36 text-left">
                    {invoice.Customer_name}
                  </TableCell>
                  <TableCell className="w-32 text-left">
                    <div className="truncate" title={invoice.Description || ''}>
                      {invoice.Description || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="w-32 text-right whitespace-nowrap">
                    {invoice.InvoiceAmount !== undefined && invoice.InvoiceAmount !== null ? 
                      new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(invoice.InvoiceAmount) 
                      : '-'}
                  </TableCell>
                  <TableCell className="w-32 text-right whitespace-nowrap">
                    {invoice.OutstandingAmount !== undefined && invoice.OutstandingAmount !== null ? 
                      new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(invoice.OutstandingAmount) 
                      : '-'}
                  </TableCell>
                  <TableCell className="w-28 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(invoice.Status)}`}>
                      {invoice.Status}
                    </span>
                  </TableCell>
                  <TableCell className="w-16 text-center">
                    <div className="flex items-center justify-center space-x-2">
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
                  <TableCell colSpan={8} className="text-center">
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
        onAlert={onAlert}
        onSave={fetchInvoices}
      />
      
      {selectedInvoice && (
        <>
          <InvoiceStatusModal
            isOpen={showStatusModal}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedInvoice(null);
            }}
            onAlert={onAlert}
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