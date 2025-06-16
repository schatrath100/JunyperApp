import React, { useState, useEffect } from 'react';
import { getTimeoutConfig } from '../config/security';
import { AlertTriangle, Clock, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  onExtendSession: () => void;
  onLogoutNow: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  isOpen,
  onExtendSession,
  onLogoutNow
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const config = getTimeoutConfig();

  useEffect(() => {
    if (!isOpen) return;

    // Initialize countdown with warning duration
    setTimeRemaining(config.warningDuration);

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, config.warningDuration]);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Session Timeout Warning
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your session will expire in <span className="font-semibold text-red-600">{formatTime(timeRemaining)}</span> due to inactivity
            </p>
          </div>
        </div>

        {/* Countdown */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 justify-center">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-lg font-mono font-bold text-amber-700 dark:text-amber-300">
              {formatTime(timeRemaining)}
            </span>
          </div>
          <p className="text-center text-sm text-amber-600 dark:text-amber-400 mt-1">
            Time remaining until automatic logout
          </p>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            For your security, you'll be automatically logged out if no activity is detected. 
            Click "Stay Logged In" to continue your session.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onExtendSession}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Stay Logged In
          </button>
          
          <button
            onClick={onLogoutNow}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <LogOut className="w-4 h-4" />
            Logout Now
          </button>
        </div>

        {/* Security note */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            🔒 This timeout helps protect your account from unauthorized access
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutWarning; 