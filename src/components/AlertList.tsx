import React from 'react';
import Alert, { Alert as AlertType } from './Alert';
import { Check } from 'lucide-react';
import Button from './Button';

interface AlertListProps {
  alerts: AlertType[];
  onDismiss: (id: string) => void;
  onMarkAllAsRead?: () => void;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, onDismiss, onMarkAllAsRead }) => {
  const unreadAlerts = alerts.filter(alert => !alert.read);

  if (unreadAlerts.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">All caught up!</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">No new notifications</p>
      </div>
    );
  }

  return (
    <>
      {unreadAlerts.length > 0 && onMarkAllAsRead && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            onClick={onMarkAllAsRead}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </button>
        </div>
      )}
      <div className="max-h-[400px] overflow-y-auto">
        {unreadAlerts.map((alert) => (
          <Alert 
            key={alert.id} 
            alert={alert} 
            onDismiss={onDismiss}
            onMarkAsRead={onMarkAllAsRead}
          />
        ))}
      </div>
    </>
  );
};

export default AlertList;
