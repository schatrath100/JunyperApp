import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bell, Settings, HelpCircle, MessageSquare, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import RecentActivity from './RecentActivity';

interface SlideInPanelProps {
  className?: string;
}

const SlideInPanel: React.FC<SlideInPanelProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(3); // Sample notification count

  // Sample quick actions
  const quickActions = [
    {
      icon: Bell,
      label: 'Notifications',
      count: notifications,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      count: 0,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'hover:bg-green-50 dark:hover:bg-green-900/20'
    },
    {
      icon: Activity,
      label: 'Activity',
      count: 0,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
    },
    {
      icon: Settings,
      label: 'Quick Settings',
      count: 0,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'hover:bg-gray-50 dark:hover:bg-gray-800'
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      count: 0,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'hover:bg-orange-50 dark:hover:bg-orange-900/20'
    }
  ];

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const panel = document.getElementById('slide-in-panel');
      if (panel && !panel.contains(event.target as Node) && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div
      id="slide-in-panel"
      className={cn(
        "fixed top-0 right-0 h-full z-50 transition-all duration-300 ease-in-out",
        isOpen ? "w-96" : "w-6",
        className
      )}
    >
      {/* Thin strip trigger */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full bg-gradient-to-b from-blue-500 to-purple-600 shadow-lg cursor-pointer transition-all duration-300",
          isOpen ? "w-0 opacity-0" : "w-6 opacity-100 hover:w-8"
        )}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex flex-col space-y-3 opacity-80">
            {quickActions.slice(0, 3).map((action, index) => {
              const Icon = action.icon;
              return (
                <div key={index} className="relative">
                  <Icon className="w-5 h-5 text-white" />
                  {action.count > 0 && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-4 rotate-90 text-white text-sm font-medium opacity-70">
            QUICK
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out",
          isOpen ? "w-96 opacity-100" : "w-0 opacity-0"
        )}
      >
        {isOpen && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Quick Actions - Takes 70% of available space */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200",
                      action.bgColor
                    )}
                    onClick={() => {
                      // Handle action click
                      console.log(`Clicked ${action.label}`);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={cn("w-6 h-6", action.color)} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {action.label}
                      </span>
                    </div>
                    {action.count > 0 && (
                      <div className="flex items-center justify-center w-6 h-6 bg-red-500 text-white text-sm font-medium rounded-full">
                        {action.count}
                      </div>
                    )}
                  </button>
                );
              })}
              
              {/* Additional content can be added here */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Quick Info
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <div>• Dashboard overview available</div>
                  <div>• Latest updates synced</div>
                  <div>• All systems operational</div>
                </div>
              </div>
            </div>

            {/* Recent Activity - Fixed 30% of panel height */}
            <div 
              className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
              style={{ height: '30%', minHeight: '200px' }}
            >
              <div className="h-full overflow-y-auto">
                <RecentActivity compact={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideInPanel; 