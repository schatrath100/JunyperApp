import React from 'react';
import { Users, Truck, Upload, Package, Settings, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShortcutTileProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}

const ShortcutTile: React.FC<ShortcutTileProps> = ({ icon, title, color, onClick }) => (
  <button
    onClick={onClick}
    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 w-full text-gray-700 dark:text-gray-300"
  >
    <div className="w-4 h-4">{icon}</div>
    <span className="text-sm">{title}</span>
  </button>
);

const ShortcutPanel: React.FC = () => {
  const navigate = useNavigate();
  const onNavigate = (path: string) => {
    navigate(path);
    // Let the parent component know that navigation occurred
    window.dispatchEvent(new CustomEvent('shortcutSelected'));
  };

  const shortcuts = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Add/Manage Customer",
      onClick: () => onNavigate('/sales/customers')
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: "Add/Manage Supplier",
      onClick: () => onNavigate('/purchases/vendors')
    },
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Upload Invoice",
      onClick: () => onNavigate('/sales/invoices')
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Manage Sales Items",
      onClick: () => onNavigate('/sales/items')
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: "Account Set-up",
      onClick: () => onNavigate('/accounts')
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: "Manage Purchase Items",
      onClick: () => onNavigate('/purchases/items')
    }
  ];

  return (
    <div 
      className="w-48 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-in-out animate-slide-in"
    >
      <div className="p-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">Shortcuts</h2>
      </div>
      <div className="p-1 space-y-1">
        {shortcuts.map((shortcut, index) => (
          <ShortcutTile key={index} {...shortcut} />
        ))}
      </div>
    </div>
  );
};

export default ShortcutPanel;