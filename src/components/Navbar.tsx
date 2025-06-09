import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown, Menu, User, LogOut, Settings } from 'lucide-react';
import { Logo } from './Logo';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DarkModeToggle from './DarkModeToggle';
import AlertList from './AlertList';
import { Alert as AlertType } from './Alert';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';

interface NavbarProps {
  alerts: AlertType[];
  onDismiss: (id: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ alerts, onDismiss }) => {
  const [showAlerts, setShowAlerts] = useState(false);
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());
  const [userName, setUserName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const navigate = useNavigate();
  const alertsRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = alerts.filter(alert => !readAlerts.has(alert.id)).length;

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('users')
          .select('full_name')
          .eq('auth_id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setUserName(data.full_name || 'User');
        }

        const { data: settings } = await supabase
          .from('accounting_settings')
          .select('company_legal_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settings) {
          setCompanyName(settings.company_legal_name || 'My Company');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, []);

  // Handle click outside to close alerts dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setShowAlerts(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAllAsRead = () => {
    const newReadAlerts = new Set(readAlerts);
    alerts.forEach(alert => newReadAlerts.add(alert.id));
    setReadAlerts(newReadAlerts);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <nav className="w-full h-16 sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="block md:hidden">
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </div>
          <Logo />
          <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-gray-700" />
          <span className="hidden md:block text-sm text-gray-500 dark:text-gray-400">{companyName}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <DarkModeToggle />
          
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
              <div ref={alertsRef} className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
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

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 animate-in fade-in-0 zoom-in-95"
                align="end"
                side="bottom"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  className={cn(
                    "relative flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none cursor-pointer",
                    "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                    "focus:bg-gray-100 dark:focus:bg-gray-700"
                  )}
                  onClick={() => navigate('/profile')}
                >
                  <User className="w-4 h-4 mr-2" />
                  <span>Profile</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={cn(
                    "relative flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none cursor-pointer",
                    "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                    "focus:bg-gray-100 dark:focus:bg-gray-700"
                  )}
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Settings</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px my-1 bg-gray-200 dark:bg-gray-700" />
                <DropdownMenu.Item
                  className={cn(
                    "relative flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 outline-none cursor-pointer",
                    "hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors",
                    "focus:bg-red-50 dark:focus:bg-red-900/20"
                  )}
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Sign out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
