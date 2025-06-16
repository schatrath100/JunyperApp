import React from 'react';
import { Clock, Shield, AlertTriangle } from 'lucide-react';
import { SECURITY_CONFIG } from '../config/security';

interface SessionTimeoutTestProps {
  isWarningShown: boolean;
  timeRemaining: string;
  onExtendSession: () => void;
  onResetTimeout: () => void;
}

const SessionTimeoutTest: React.FC<SessionTimeoutTestProps> = ({
  isWarningShown,
  timeRemaining,
  onExtendSession,
  onResetTimeout
}) => {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm z-40">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Session Security Test
        </h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Timeout Duration:</span>
          <span className="font-mono text-gray-900 dark:text-white">
            {formatDuration(SECURITY_CONFIG.SESSION_TIMEOUT.DURATION)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Warning Duration:</span>
          <span className="font-mono text-gray-900 dark:text-white">
            {formatDuration(SECURITY_CONFIG.SESSION_TIMEOUT.WARNING_DURATION)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Warning Active:</span>
          <div className="flex items-center gap-1">
            {isWarningShown ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-amber-600 font-medium">Yes</span>
              </>
            ) : (
              <span className="text-green-600 font-medium">No</span>
            )}
          </div>
        </div>
        
        {isWarningShown && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Time Remaining:</span>
            <span className="font-mono text-red-600 font-bold">
              {timeRemaining}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={onExtendSession}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          Extend
        </button>
        <button
          onClick={onResetTimeout}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          Reset
        </button>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 Stop moving mouse/keyboard for {formatDuration(SECURITY_CONFIG.SESSION_TIMEOUT.DURATION - SECURITY_CONFIG.SESSION_TIMEOUT.WARNING_DURATION)} to trigger warning
        </p>
      </div>
    </div>
  );
};

export default SessionTimeoutTest; 