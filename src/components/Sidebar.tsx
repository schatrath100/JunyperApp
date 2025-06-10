import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, ShoppingCart, Receipt, Bot, Settings, LogOut, Sparkles, ChevronDown, Users, FileText, Building2, ScrollText, Package, Boxes, BookOpenCheck, Wallet, Check, User2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';

interface SidebarProps {
  onToggleShortcuts: () => void;
  showShortcuts: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface AccountingSettings {
  company_legal_name: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  rightIcon?: React.ReactNode;
  className?: string;
  collapsed?: boolean;
  isDashboard?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ 
  icon, 
  label, 
  active, 
  onClick, 
  rightIcon, 
  children, 
  className = '', 
  collapsed,
  isDashboard 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDashboard || !onClick) {
      e.currentTarget.blur();
    }
    onClick?.();
  };

  return (
  <div>
    <button 
      className={`
        w-full flex items-center justify-between px-3 py-2 rounded-lg
        ${active ? 'bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
        transition-colors duration-150
        ${className}
      `}
      onClick={handleClick}
      title={typeof label === 'string' ? label : "I'm Sydney—ask me anything about your books!"}
    >
      <div className={`flex items-center ${collapsed ? 'justify-center w-8 h-8' : 'space-x-3'}`}>
        {icon}
        {!collapsed && <span className="font-medium">{label}</span>}
      </div>
      {rightIcon}
    </button>
    {children}
  </div>
  );
};

const Sidebar: React.FC<{
  onToggleShortcuts: () => void;
  showShortcuts: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}> = ({ onToggleShortcuts, showShortcuts, collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [salesOpen, setSalesOpen] = useState(false);
  const [purchasesOpen, setPurchasesOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('accounting_settings')
          .select('company_legal_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setCompanyName(data.company_legal_name || 'My Company');
        }
      } catch (err) {
        console.error('Error fetching company name:', err);
      }
    };

    fetchCompanyName();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user);
        if (!user) return;

        const { data, error } = await supabase
          .from('users')
          .select('full_name')
          .eq('auth_id', user.id)
          .single();

        console.log('User profile data:', data);
        console.log('User profile error:', error);

        if (error) throw error;
        if (data) {
          setUserName(data.full_name || 'User');
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <aside className={`hidden md:flex flex-col fixed top-16 left-0 ${collapsed ? 'w-16' : 'w-56'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-500 ease-in-out h-[calc(100vh-4rem)] z-10`}>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            <NavItem 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label={collapsed ? "" : "Dashboard"}
              active={location.pathname === '/dashboard'} 
              onClick={() => {
                if (location.pathname === '/dashboard') {
                  onToggleCollapse();
                } else {
                  navigate('/dashboard');
                }
              }}
              className="cursor-pointer"
              collapsed={collapsed}
              isDashboard={true}
            />
            <NavItem 
              icon={<BookOpen className="w-5 h-5" />} 
              label={collapsed ? "" : "Accounts"}
              active={location.pathname === '/accounts'} 
              onClick={() => navigate('/accounts')}
              collapsed={collapsed}
            />
            <NavItem 
              icon={<ShoppingCart className="w-5 h-5" />} 
              label={collapsed ? "" : "Sales"}
              active={location.pathname.startsWith('/sales')}
              onClick={() => setSalesOpen(!salesOpen)}
              rightIcon={!collapsed && (
                <ChevronDown className={`w-4 h-4 transition-transform ${salesOpen ? 'transform rotate-180' : ''}`} />
              )}
              collapsed={collapsed}
            >
              {salesOpen && !collapsed && (
                <div className="ml-6 space-y-1 mt-1">
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/sales/customers' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/sales/customers');
                    }}
                  >
                    <Users className="w-4 h-4" />
                    <span>Customers</span>
                  </button>
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/sales/invoices' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/sales/invoices');
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Invoices</span>
                  </button>
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/sales/items' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/sales/items');
                    }}
                  >
                    <Package className="w-4 h-4" />
                    <span>Sale Items</span>
                  </button>
                </div>
              )}
            </NavItem>
            <NavItem 
              icon={<Receipt className="w-5 h-5" />} 
              label={collapsed ? "" : "Purchases"}
              active={location.pathname.startsWith('/purchases')}
              onClick={() => setPurchasesOpen(!purchasesOpen)}
              rightIcon={!collapsed && (
                <ChevronDown className={`w-4 h-4 transition-transform ${purchasesOpen ? 'transform rotate-180' : ''}`} />
              )}
              collapsed={collapsed}
            >
              {purchasesOpen && !collapsed && (
                <div className="ml-6 space-y-1 mt-1">
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/purchases/vendors' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/purchases/vendors');
                    }}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Vendors</span>
                  </button>
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/purchases/bills' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/purchases/bills');
                    }}
                  >
                    <ScrollText className="w-4 h-4" />
                    <span>Bills</span>
                  </button>
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/purchases/items' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/purchases/items');
                    }}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Purchase Items</span>
                  </button>
                </div>
              )}
            </NavItem>
            <NavItem 
              icon={<Bot className="w-5 h-5" />} 
              label={
                collapsed ? "" : <div className="flex items-center">
                  <span className="font-medium italic font-bold text-teal-600 dark:text-teal-400">Sydney AI</span>
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 rounded-full">New</span>
                </div>
              }
              active={location.pathname === '/sydney-ai'}
              onClick={() => navigate('/sydney-ai')}
              className="group hover:scale-105 transition-transform [&>button>div>*:first-child]:text-teal-600 dark:[&>button>div>*:first-child]:text-teal-400"
              collapsed={collapsed}
            />
            <NavItem 
              icon={<BookOpenCheck className="w-5 h-5" />} 
              label={collapsed ? "" : "Journals"}
              active={location.pathname === '/journals'} 
              onClick={() => navigate('/journals')}
              collapsed={collapsed}
            />
            <NavItem 
              icon={<Wallet className="w-5 h-5" />} 
              label={collapsed ? "" : "Banking"}
              active={location.pathname === '/bank-transactions'}
              onClick={() => navigate('/bank-transactions')} 
              collapsed={collapsed}
            />
            <NavItem 
              icon={<LogOut className="w-5 h-5" />} 
              label={collapsed ? "" : "Logout"}
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/auth');
              }}
              className="mt-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              collapsed={collapsed}
            />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      {!collapsed &&
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* User Profile with Company Settings */}
          <div className="relative">
            <button 
              className="w-full px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all duration-200 flex items-center group"
              onClick={() => {
                console.log('Button clicked');
                const menu = document.getElementById('user-menu');
                if (menu) {
                  menu.classList.toggle('hidden');
                }
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
                <User2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-gray-500 dark:text-gray-400">{companyName}</span>
                <span className="truncate font-semibold">Hey {userName}</span>
              </div>
              <ChevronDown className="w-4 h-4 ml-auto text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </button>
            
            <div 
              id="user-menu" 
              className="hidden absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              style={{ transform: 'translateY(-8px)' }}
            >
              <button
                className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                onClick={() => navigate('/profile')}
              >
                <User2 className="w-4 h-4 mr-2" />
                <span>Account</span>
              </button>
              <button
                className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                onClick={() => navigate('/settings')}
              >
                <Settings className="w-4 h-4 mr-2" />
                <span>Company Settings</span>
              </button>
              <div className="h-px my-1 bg-gray-200 dark:bg-gray-700" />
              <button
                className="w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/auth');
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      }
    </aside>
  );
};

export default Sidebar;
