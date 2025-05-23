import React from 'react';
import { X } from 'lucide-react';

export interface Alert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  createdAt: Date;
}

interface AlertProps {
  alert: Alert;
  onDismiss: (id: string) => void;
}

const Alert: React.FC<AlertProps> = ({ alert, onDismiss }) => {
  const getBgColor = () => {
    switch (alert.type) {
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300';
      case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
      case 'success': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getBgColor()} relative`}>
      <button
        onClick={() => onDismiss(alert.id)}
        className="absolute top-2 right-2 text-current opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="pr-6">{alert.message}</p>
      <span className="text-xs opacity-70 mt-1 block">
        {new Date(alert.createdAt).toLocaleTimeString()}
      </span>
    </div>
  );
};

export default Alert;

export { Alert }