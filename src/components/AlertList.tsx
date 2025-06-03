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

  if (alerts.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No notifications
      </div>
    );
  }

  return (
    <>
      {unreadAlerts.length > 0 && onMarkAllAsRead && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            className="w-full text-sm"
            onClick={onMarkAllAsRead}
            icon={<Check className="w-4 h-4" />}
          >
            Mark all as read
          </Button>
        </div>
      )}
      <div className="space-y-2 max-h-[400px] overflow-y-auto p-2">
        {alerts.map((alert) => (
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
