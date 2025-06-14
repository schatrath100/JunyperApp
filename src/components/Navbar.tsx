import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown, Menu, User, LogOut, Settings } from 'lucide-react';
import { Logo } from './Logo';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DarkModeToggle from './DarkModeToggle';
import AlertList from './AlertList';
import { Alert as AlertType } from './Alert';
import { Notification } from '../hooks/useNotifications';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';
import { useUserProfile } from '../hooks/useUserProfile';

interface NavbarProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationIds?: string[]) => Promise<void>;
  onDismiss: (notificationIds: string[]) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
}

const Navbar: React.FC<NavbarProps> = ({ 
  notifications, 
  unreadCount, 
  onMarkAsRead, 
  onDismiss, 
  onMarkAllAsRead 
}) => {
  const [showAlerts, setShowAlerts] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');
  const navigate = useNavigate();
  const alertsRef = React.useRef<HTMLDivElement>(null);
  const { userName, userAvatar, setUserAvatar } = useUserProfile();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        console.log('[Navbar] Fetching profile for user:', user.id);
        const { data, error } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('auth_id', user.id)
          .single();

        if (error) {
          console.error('[Navbar] Error fetching profile:', error);
          throw error;
        }
        
        if (data) {
          console.log('[Navbar] Profile data:', data);
          console.log('[Navbar] Avatar URL before setting:', data.avatar_url);
          setUserAvatar(data.avatar_url || '');
          console.log('[Navbar] Avatar URL after setting:', data.avatar_url);
        }

        const { data: settings } = await supabase
          .from('accounting_settings')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settings) {
          setCompanyName(settings.display_name || 'My Company');
        }
      } catch (err) {
        console.error('[Navbar] Error fetching user profile:', err);
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

  const handleMarkAllAsRead = async () => {
    await onMarkAllAsRead();
    // Close the notifications dropdown after marking all as read
    setShowAlerts(false);
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

  // Debug: Log avatar and name whenever they change
  React.useEffect(() => {
    console.log('[Navbar] userName:', userName);
    console.log('[Navbar] userAvatar:', userAvatar);
  }, [userName, userAvatar]);

  return (
    <nav className="w-full h-16 sticky top-0 z-50 backdrop-blur-md bg-gradient-to-r from-white via-blue-100/50 to-white dark:from-gray-900 dark:via-blue-900/40 dark:to-gray-900 border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="block md:hidden">
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
          </div>
          <Logo />
          <div className="hidden md:block h-6 w-px bg-gradient-to-b from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800" />
          <span className="hidden md:block text-sm font-medium text-gray-600 dark:text-gray-300">{companyName}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <DarkModeToggle />
          
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-gray-700 dark:text-gray-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] text-xs font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full px-1 shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
            {showAlerts && (
              <div ref={alertsRef} className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden backdrop-blur-sm">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>
                <AlertList 
                  alerts={notifications.map(notification => ({
                    id: notification.id,
                    message: notification.message,
                    type: notification.type,
                    createdAt: new Date(notification.created_at),
                    read: notification.read
                  }))} 
                  onDismiss={(id: string) => onDismiss([id])}
                  onMarkAllAsRead={handleMarkAllAsRead}
                />
              </div>
            )}
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm overflow-hidden">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('[Navbar] Error loading avatar image:', e);
                        const img = e.target as HTMLImageElement;
                        console.log('[Navbar] Failed image URL:', img.src);
                        console.log('[Navbar] Current userAvatar state:', userAvatar);
                        
                        // Test URL accessibility
                        fetch(img.src, { method: 'HEAD' })
                          .then(response => {
                            console.log('[Navbar] URL accessibility test:', {
                              status: response.status,
                              ok: response.ok,
                              headers: Object.fromEntries(response.headers.entries())
                            });
                          })
                          .catch(err => {
                            console.error('[Navbar] URL accessibility test failed:', err);
                          });
                        
                        img.src = ''; // Clear the src on error
                        setUserAvatar(''); // Reset avatar URL on error
                      }}
                      onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        console.log('[Navbar] Avatar image loaded successfully');
                        console.log('[Navbar] Loaded image URL:', userAvatar);
                        console.log('[Navbar] Image element:', {
                          src: e.currentTarget.src,
                          naturalWidth: e.currentTarget.naturalWidth,
                          naturalHeight: e.currentTarget.naturalHeight
                        });
                      }}
                    />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
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
                <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                  Hey {userName.split(' ')[0]}
                </div>
                <DropdownMenu.Separator className="h-px my-1 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800" />
                <DropdownMenu.Item
                  className={cn(
                    "relative flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none cursor-pointer",
                    "hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors",
                    "focus:bg-blue-50 dark:focus:bg-blue-900/20"
                  )}
                  onClick={() => navigate('/profile')}
                >
                  <User className="w-4 h-4 mr-2" />
                  <span>Profile</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={cn(
                    "relative flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none cursor-pointer",
                    "hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors",
                    "focus:bg-blue-50 dark:focus:bg-blue-900/20"
                  )}
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Settings</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px my-1 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800" />
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
