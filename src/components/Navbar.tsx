import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown, Menu, User, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DarkModeToggle from './DarkModeToggle';
import AlertList from './AlertList';
import { Alert as AlertType } from './Alert';

interface NavbarProps {
  alerts: AlertType[];
  onDismiss: (id: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ alerts, onDismiss }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const unreadCount = alerts.filter(alert => !readAlerts.has(alert.id)).length;

  const handleMarkAllAsRead = () => {
    const newReadAlerts = new Set(readAlerts);
    alerts.forEach(alert => newReadAlerts.add(alert.id));
    setReadAlerts(newReadAlerts);
  };

  // Auto-dismiss success alerts after 5 seconds
  useEffect(() => {
    const successAlerts = alerts.filter(alert => alert.type === 'success');
    successAlerts.forEach(alert => {
      const timer = setTimeout(() => {
        onDismiss(alert.id);
      }, 5000);
      return () => clearTimeout(timer);
    });
  }, [alerts, onDismiss]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (err) {
      console.error('Error logging out:', err);
    }
    setShowDropdown(false);
  };

  return (
    <nav className="w-full h-16 py-4 px-6 flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="flex items-center">
        <div className="block md:hidden mr-4">
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </div>
        <Logo />
      </div>
      
      <div className="flex items-center space-x-2">
        <DarkModeToggle />
        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] text-xs font-medium text-white bg-red-500 rounded-full px-1">
                {unreadCount}
              </span>
            )}
          </button>
          {showAlerts && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
              </div>
              <AlertList 
                alerts={alerts.map(alert => ({ ...alert, read: readAlerts.has(alert.id) }))} 
                onDismiss={onDismiss}
                onMarkAllAsRead={handleMarkAllAsRead}
              />
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Account menu"
          >
            <User className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  navigate('/profile');
                  setShowDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
