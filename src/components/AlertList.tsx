import React from 'react';
import Alert, { Alert as AlertType } from './Alert';

interface AlertListProps {
  alerts: AlertType[];
  onDismiss: (id: string) => void;
}

const AlertList: React.FC<AlertListProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No notifications
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {alerts.map((alert) => (
        <Alert key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default AlertList;