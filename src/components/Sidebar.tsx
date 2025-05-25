import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, ShoppingCart, Receipt, Bot, Settings, LogOut, Sparkles, ChevronDown, Users, FileText, Building2, ScrollText, Package, Boxes, BookOpenCheck, Wallet, Check, User2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';

interface AccountingSettings {
  company_legal_name: string;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  rightIcon?: React.ReactNode;
  className?: string;
}> = ({ icon, label, active, onClick, rightIcon, children, className = '' }) => (
  <div>
  <button 
    className={`
      w-full flex items-center justify-between px-3 py-2 rounded-lg
      ${active ? 'bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
      transition-colors duration-150
      ${className}
    `}
    onClick={onClick}
    title={typeof label === 'string' ? label : "I'm Sydney—ask me anything about your books!"}
  >
    <div className="flex items-center space-x-3">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    {rightIcon}
  </button>
  {children}
  </div>
);

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
          .single();

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
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <aside className={`hidden md:flex flex-col ${collapsed ? 'w-16' : 'w-56'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 relative h-full`}>
      {/* Workspace Selector */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-between">
                <span className="truncate">{companyName}</span>
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 animate-in fade-in-0 zoom-in-95 min-w-[200px]"
                align="start"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  className={cn(
                    "relative flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none cursor-pointer",
                    "hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                    "focus:bg-gray-100 dark:focus:bg-gray-700"
                  )}
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  <span>Company Settings</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )}
      
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            <NavItem
              icon={<Sparkles className={`w-5 h-5 transition-colors duration-150 ${showShortcuts ? 'text-green-600 dark:text-green-400' : ''}`} />}
              label={collapsed ? "" : "Shortcuts"}
              active={false}
              onClick={onToggleShortcuts}
            />
            <NavItem 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label={collapsed ? "" : "Dashboard"}
              active={location.pathname === '/dashboard'} 
              onClick={() => navigate('/dashboard')}
            />
            <NavItem 
              icon={<BookOpen className="w-5 h-5" />} 
              label={collapsed ? "" : "Accounts"}
              active={location.pathname === '/accounts'} 
              onClick={() => navigate('/accounts')}
            />
            <NavItem 
              icon={<ShoppingCart className="w-5 h-5" />} 
              label={collapsed ? "" : "Sales"}
              active={location.pathname.startsWith('/sales')}
              onClick={() => setSalesOpen(!salesOpen)}
              rightIcon={!collapsed && (
                <ChevronDown className={`w-4 h-4 transition-transform ${salesOpen ? 'transform rotate-180' : ''}`} />
              )}
            >
              {salesOpen && !collapsed && (
                <div className="ml-6 space-y-1 mt-1">
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/sales/customers' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={() => navigate('/sales/customers')}
                  >
                    <Users className="w-4 h-4" />
                    <span>Customers</span>
                  </button>
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/sales/invoices' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={() => navigate('/sales/invoices')}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Invoices</span>
                  </button>
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/sales/items' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={() => navigate('/sales/items')}
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
            >
              {purchasesOpen && !collapsed && (
                <div className="ml-6 space-y-1 mt-1">
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/purchases/vendors' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={() => navigate('/purchases/vendors')}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Vendors</span>
                  </button>
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/purchases/bills' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={() => navigate('/purchases/bills')}
                  >
                    <ScrollText className="w-4 h-4" />
                    <span>Bills</span>
                  </button>
                  <button
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm
                      ${location.pathname === '/purchases/items' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                    `}
                    onClick={() => navigate('/purchases/items')}
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
            />
            <NavItem 
              icon={<BookOpenCheck className="w-5 h-5" />} 
              label={collapsed ? "" : "Journals"}
              active={location.pathname === '/journals'} 
              onClick={() => navigate('/journals')}
            />
            <NavItem 
              icon={<Wallet className="w-5 h-5" />} 
              label={collapsed ? "" : "Banking"}
              active={location.pathname === '/bank-transactions'}
              onClick={() => navigate('/bank-transactions')} 
            />
            <NavItem 
              icon={<LogOut className="w-5 h-5" />} 
              label={collapsed ? "" : "Logout"}
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/auth');
              }}
              className="mt-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            />
          </div>
        </div>
      </div>
      
      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute bottom-4 left-4 w-8 h-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>
      
      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mt-auto">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center">
                <User2 className="w-4 h-4 mr-2" />
                <span className="truncate">{userName}</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 animate-in fade-in-0 zoom-in-95"
                align="end"
                side="top"
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
                  <span>Account</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px my-1 bg-gray-200 dark:bg-gray-700" />
                <DropdownMenu.Item
                  className={cn(
                    "relative flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 outline-none cursor-pointer",
                    "hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors",
                    "focus:bg-red-50 dark:focus:bg-red-900/20"
                  )}
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/auth');
                  }}
                >
                  <span>Sign out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;