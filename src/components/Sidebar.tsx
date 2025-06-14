import React, { useState, useEffect } from 'react';
import { LayoutGrid, Landmark, Receipt, Bot, Settings, LogOut, Sparkles, ChevronDown, Users, FileText, Building2, ScrollText, Package, Boxes, BookOpenCheck, Wallet, Check, User2, ChevronLeft, ChevronRight, BarChart3, UserCircle2, PackageSearch, ShoppingBag, Store, PanelLeftClose, PanelRightOpen, ArrowUpDown, Calculator, CreditCard } from 'lucide-react';
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
  children?: React.ReactNode;
  onToggleCollapse: () => void;
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
  onToggleCollapse
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;

    const iconContainer = e.currentTarget.querySelector(`.${collapsed ? 'justify-center' : 'space-x-3'}`);
    const iconElement = iconContainer?.firstElementChild;

    let clickedOnIconPart = false;
    if (iconElement) {
      clickedOnIconPart = iconElement.contains(target) || iconElement === target;
    }

    // If sidebar is expanded AND the click was specifically on the icon part, toggle collapse
    // OR if sidebar is collapsed AND the click was specifically on the icon part, toggle uncollapse
    if (clickedOnIconPart) {
      onToggleCollapse();
    }

    // Always perform the primary action (navigation) associated with the NavItem
    onClick?.();

    // Remove focus from the button after click
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.blur();
    }
  };

  return (
    <div>
      <button 
        className={`
          w-full flex items-center justify-between px-2.5 py-1 rounded-md
          ${active ? 'bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
          transition-colors duration-150
          ${className}
        `}
        onClick={handleClick}
        title={typeof label === 'string' ? label : "I'm Sydney—ask me anything about your books!"}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center w-7 h-7' : 'space-x-2.5'}`}>
          {icon}
          {!collapsed && <span className="font-medium text-sm">{label}</span>}
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
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="pt-0">
            <div className="space-y-1">
              <NavItem 
                icon={<LayoutGrid className="w-4 h-4" />} 
                label={collapsed ? "" : "Dashboard"}
                active={location.pathname === '/dashboard'} 
                onClick={() => {
                  if (location.pathname === '/dashboard') {
                    onToggleCollapse();
                  } else {
                    navigate('/dashboard');
                  }
                }}
                rightIcon={!collapsed ? <ChevronLeft className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                className="cursor-pointer"
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
              <div className="px-3 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {collapsed ? "" : "Sales"}
              </div>
              <NavItem 
                icon={<UserCircle2 className="w-4 h-4" />} 
                label={collapsed ? "" : "Customers"}
                active={location.pathname === '/sales/customers'}
                onClick={() => navigate('/sales/customers')}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <NavItem 
                icon={<Receipt className="w-4 h-4" />} 
                label={collapsed ? "" : "Invoices"}
                active={location.pathname === '/sales/invoices'}
                onClick={() => navigate('/sales/invoices')}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <NavItem 
                icon={<ShoppingBag className="w-4 h-4" />} 
                label={collapsed ? "" : "Sale Items"}
                active={location.pathname === '/sales/items'}
                onClick={() => navigate('/sales/items')}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
              <div className="px-3 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {collapsed ? "" : "Purchases"}
              </div>
              <NavItem 
                icon={<Store className="w-4 h-4" />} 
                label={collapsed ? "" : "Vendors"}
                active={location.pathname === '/purchases/vendors'}
                onClick={() => navigate('/purchases/vendors')}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <NavItem 
                icon={<Receipt className="w-4 h-4" />} 
                label={collapsed ? "" : "Expenses"}
                active={location.pathname === '/purchases/bills'}
                onClick={() => navigate('/purchases/bills')}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <NavItem 
                icon={<Boxes className="w-4 h-4" />} 
                label={collapsed ? "" : "Purchase Items"}
                active={location.pathname === '/purchases/items'}
                onClick={() => navigate('/purchases/items')}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
              <div className="px-3 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {collapsed ? "" : "Accounting"}
              </div>
              <NavItem 
                icon={<Calculator className="w-4 h-4" />} 
                label={collapsed ? "" : "Set-up"}
                active={location.pathname === '/accounts'}
                onClick={() => navigate('/accounts')}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <NavItem 
                icon={<BookOpenCheck className="w-4 h-4" />} 
                label={collapsed ? "" : "Journals"}
                active={location.pathname === '/journals'} 
                onClick={() => navigate('/journals')}
                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent"
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
              <div className="px-3 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {collapsed ? "" : "Banking"}
              </div>
              <NavItem 
                icon={<CreditCard className="w-4 h-4" />} 
                label={collapsed ? "" : "Set-up"}
                active={location.pathname === '/banking/setup'}
                onClick={() => navigate('/banking/setup')} 
                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent"
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <NavItem 
                icon={<ArrowUpDown className="w-4 h-4" />} 
                label={collapsed ? "" : "Transactions"}
                active={location.pathname === '/bank-transactions'}
                onClick={() => navigate('/bank-transactions')} 
                className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent dark:hover:from-blue-900/20 dark:hover:to-transparent"
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
              <NavItem 
                icon={<LogOut className="w-4 h-4" />} 
                label={collapsed ? "" : "Logout"}
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate('/auth');
                }}
                className="mt-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent dark:hover:from-red-900/20 dark:hover:to-transparent"
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
