import React, { useState, useEffect } from 'react';
import { X, FileText, Download } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase'; 

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: { id: number; attachment_path?: string | null; };
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ isOpen, onClose, invoice }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPdf = async () => {
      if (!invoice.attachment_path) return;

      try {
        setLoading(true);
        const { data, error } = await supabase.storage
          .from('invoicefiles')
          .createSignedUrl(invoice.attachment_path, 3600);

        if (error) throw error;
        setPdfUrl(data.signedUrl);
      } catch (err) {
        console.error('Error fetching PDF:', err);
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && invoice.attachment_path) {
      fetchPdf();
    }

    return () => {
      setPdfUrl(null);
      setError(null);
      setLoading(false);
    };
  }, [isOpen, invoice.attachment_path]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Invoice #{invoice.id} Preview
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {error ? (
            <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-red-500 dark:text-red-400">{error}</p>
            </div>
          ) : !invoice.attachment_path ? (
            <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">No attachment available</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : pdfUrl && (
            <div className="space-y-4">
              <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">PDF document ready for viewing</p>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Open PDF
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;