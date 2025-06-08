import React from 'react';
import { Plus, X, LayoutDashboard, BookOpen, FileText, Receipt, Bot, BookOpenCheck, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface ShortcutPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutPanel: React.FC<ShortcutPanelProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const shortcuts = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', path: '/dashboard' },
    { icon: <BookOpen className="w-5 h-5" />, label: 'Accounts', path: '/accounts' },
    { icon: <FileText className="w-5 h-5" />, label: 'Invoices', path: '/sales/invoices' },
    { icon: <Receipt className="w-5 h-5" />, label: 'Bills', path: '/purchases/bills' },
    { icon: <Bot className="w-5 h-5" />, label: 'Sydney AI', path: '/sydney-ai' },
    { icon: <BookOpenCheck className="w-5 h-5" />, label: 'Journals', path: '/journals' },
    { icon: <Wallet className="w-5 h-5" />, label: 'Banking', path: '/bank-transactions' },
  ];

  const handleShortcutClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed bottom-0 right-0 z-50">
      {/* Floating Action Button */}
      <button
        onClick={onClose}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg",
          "flex items-center justify-center transition-all duration-300",
          "hover:scale-110 hover:shadow-xl",
          "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
          isOpen ? "rotate-45" : ""
        )}
        aria-label={isOpen ? "Close shortcuts" : "Open shortcuts"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>

      {/* Shortcuts Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-40 animate-in slide-in-from-bottom-5 duration-300"
          role="dialog"
          aria-label="Quick access shortcuts"
        >
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Quick Access</h3>
            <div className="space-y-1">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut.path}
                  onClick={() => handleShortcutClick(shortcut.path)}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  {shortcut.icon}
                  <span>{shortcut.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortcutPanel;
