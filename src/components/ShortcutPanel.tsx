import React from 'react';
import { Users, Truck, Upload, Package, Settings, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShortcutTileProps {
  icon: React.ReactNode;
  title: string;
  color: string;
  onClick: () => void;
}

const ShortcutTile: React.FC<ShortcutTileProps> = ({ icon, title, color, onClick }) => (
  <button
    onClick={onClick}
    className={`${color} p-4 rounded-lg text-white transition-transform hover:scale-105 flex flex-col items-center text-center space-y-3 w-full`}
  >
    <div className="w-10 h-10 flex items-center justify-center">
      {icon}
    </div>
    <span className="font-medium text-sm">{title}</span>
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
      color: "bg-purple-500 hover:bg-purple-600",
      onClick: () => onNavigate('/sales/customers')
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: "Add/Manage Supplier",
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: () => onNavigate('/purchases/vendors')
    },
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Upload Invoice",
      color: "bg-green-500 hover:bg-green-600",
      onClick: () => onNavigate('/sales/invoices')
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: "Manage Sales Items",
      color: "bg-yellow-500 hover:bg-yellow-600",
      onClick: () => onNavigate('/sales/items')
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: "Account Set-up",
      color: "bg-red-500 hover:bg-red-600",
      onClick: () => onNavigate('/accounts')
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: "Manage Purchase Items",
      color: "bg-indigo-500 hover:bg-indigo-600",
      onClick: () => onNavigate('/purchases/items')
    }
  ];

  return (
    <div 
      className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4 transform transition-all duration-300 ease-in-out animate-slide-in"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shortcuts</h2>
      <div className="grid grid-cols-1 gap-4">
        {shortcuts.map((shortcut, index) => (
          <ShortcutTile key={index} {...shortcut} />
        ))}
      </div>
    </div>
  );
};

export default ShortcutPanel;
