import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Check } from 'lucide-react';

export interface Alert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  createdAt: Date;
  read?: boolean;
}

interface AlertProps {
  alert: Alert;
  onDismiss: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}

const Alert: React.FC<AlertProps> = ({ alert, onDismiss, onMarkAsRead }) => {
  const getBgColor = () => {
    switch (alert.type) {
      case 'info': return 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
      case 'warning': return 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300';
      case 'error': return 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
      case 'success': return 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getIcon = () => {
    switch (alert.type) {
      case 'info': return <Info className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'success': return <CheckCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div 
      className={`mx-3 my-2 p-4 rounded-xl border ${getBgColor()} relative transition-all duration-200 hover:shadow-sm ${
        alert.read ? 'opacity-75' : ''
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed">{alert.message}</p>
          <p className="mt-2 text-xs opacity-75 font-medium">
            {new Date(alert.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          {!alert.read && onMarkAsRead && (
            <button
              onClick={() => onMarkAsRead(alert.id)}
              className="p-1.5 text-current opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-all duration-200"
              title="Mark as read"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onDismiss(alert.id)}
            className="p-1.5 text-current opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-all duration-200"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Alert;

export { Alert }
