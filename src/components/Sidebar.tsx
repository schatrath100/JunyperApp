import React, { useState, useEffect } from 'react';
import { LayoutGrid, Landmark, Receipt, Bot, Settings, LogOut, Sparkles, ChevronDown, Users, FileText, Building2, ScrollText, Package, Boxes, BookOpenCheck, Wallet, Check, User2, ChevronLeft, ChevronRight, BarChart3, UserCircle2, PackageSearch, ShoppingBag, Store } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';
import { useUserProfile } from '../hooks/useUserProfile';

interface SidebarProps {
  onToggleShortcuts: () => void;
  showShortcuts: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface AccountingSettings {
  company_legal_name: string;
  display_name: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  rightIcon?: React.ReactNode;
  className?: string;
  collapsed?: boolean;
  isDashboard?: boolean;
  children?: React.ReactNode;
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
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.blur();
      }
    }
    onClick?.();
  };

  return (
    <div>
      <button 
        className={`
          w-full flex items-center justify-between px-3 py-1.5 rounded-lg
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
  const { userName } = useUserProfile();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('accounting_settings')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setCompanyName(data.display_name || 'My Company');
        }
      } catch (err) {
        console.error('Error fetching company name:', err);
      }
    };

    fetchCompanyName();
  }, []);

  return (
    <aside className={`hidden md:flex flex-col fixed top-16 left-0 ${collapsed ? 'w-16' : 'w-56'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-500 ease-in-out h-[calc(100vh-4rem)] z-10`}>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            <NavItem 
              icon={<LayoutGrid className="w-5 h-5" />} 
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
              icon={<Landmark className="w-5 h-5" />} 
              label={collapsed ? "" : "Accounts"}
              onClick={() => navigate('/accounts')}
              collapsed={collapsed}
            />
            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
            <div className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {collapsed ? "" : "Sales"}
            </div>
            <NavItem 
              icon={<UserCircle2 className="w-5 h-5" />} 
              label={collapsed ? "" : "Customers"}
              active={location.pathname === '/sales/customers'}
              onClick={() => navigate('/sales/customers')}
              collapsed={collapsed}
            />
            <NavItem 
              icon={<Receipt className="w-5 h-5" />} 
              label={collapsed ? "" : "Invoices"}
              active={location.pathname === '/sales/invoices'}
              onClick={() => navigate('/sales/invoices')}
              collapsed={collapsed}
            />
            <NavItem 
              icon={<PackageSearch className="w-5 h-5" />} 
              label={collapsed ? "" : "Sale Items"}
              active={location.pathname === '/sales/items'}
              onClick={() => navigate('/sales/items')}
              collapsed={collapsed}
            />
            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
            <div className="px-4 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {collapsed ? "" : "Purchases"}
            </div>
            <NavItem 
              icon={<Store className="w-5 h-5" />} 
              label={collapsed ? "" : "Vendors"}
              active={location.pathname === '/purchases/vendors'}
              onClick={() => navigate('/purchases/vendors')}
              collapsed={collapsed}
            />
            <NavItem 
              icon={<Receipt className="w-5 h-5" />} 
              label={collapsed ? "" : "Bills"}
              active={location.pathname === '/purchases/bills'}
              onClick={() => navigate('/purchases/bills')}
              collapsed={collapsed}
            />
            <NavItem 
              icon={<PackageSearch className="w-5 h-5" />} 
              label={collapsed ? "" : "Purchase Items"}
              active={location.pathname === '/purchases/items'}
              onClick={() => navigate('/purchases/items')}
              collapsed={collapsed}
            />
            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
            <NavItem 
              icon={<Bot className="w-5 h-5 text-gradient-to-r from-blue-500 to-teal-400 animate-pulse" />} 
              label={
                collapsed ? "" : <span className="font-medium italic font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">Sydney AI</span>
              }
              active={location.pathname === '/sydney-ai'}
              onClick={() => navigate('/sydney-ai')}
              className="group hover:scale-105 transition-transform [&>button>div>*:first-child]:text-teal-600 dark:[&>button>div>*:first-child]:text-teal-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent"
              collapsed={collapsed}
            />
            <NavItem 
              icon={<BookOpenCheck className="w-5 h-5" />} 
              label={collapsed ? "" : "Journals"}
              active={location.pathname === '/journals'} 
              onClick={() => navigate('/journals')}
              className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent"
              collapsed={collapsed}
            />
            <NavItem 
              icon={<Wallet className="w-5 h-5" />} 
              label={collapsed ? "" : "Banking"}
              active={location.pathname === '/bank-transactions'}
              onClick={() => navigate('/bank-transactions')} 
              className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent"
              collapsed={collapsed}
            />
            <NavItem 
              icon={<LogOut className="w-5 h-5" />} 
              label={collapsed ? "" : "Logout"}
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/auth');
              }}
              className="mt-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent dark:hover:from-red-900/20 dark:hover:to-transparent"
              collapsed={collapsed}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
