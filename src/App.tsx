import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  Users, 
  FileText, 
  Package, 
  Building2, 
  ScrollText, 
  Boxes, 
  Wallet, 
  Settings as SettingsIcon, 
  User 
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Sales from './pages/Sales';
import Journals from './pages/Journals';
import SalesItems from './pages/SalesItems';
import Customers from './pages/Customers';
import BankTransactions from './pages/BankTransactions';
import Settings from './pages/Settings';
import PurchaseItems from './pages/PurchaseItems';
import Vendors from './pages/Vendors';
import VendorBills from './pages/VendorBills';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import VerifyEmail from './pages/VerifyEmail';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { ShortcutBar, type ShortcutItem } from './components/ShortcutBar';
import { supabase } from './lib/supabase';
import { Alert } from './components/Alert';

function App() {
  const [session, setSession] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [navigate, setNavigate] = useState<((path: string) => void) | null>(null);

  const addAlert = (message: string, type: Alert['type'] = 'info') => {
    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      createdAt: new Date(),
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  // Create shortcut items
  const shortcutItems: ShortcutItem[] = navigate ? [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'View your financial overview',
      icon: <Home className="h-4 w-4" />,
      shortcut: '⌘D',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'accounts',
      title: 'Accounts',
      description: 'Manage chart of accounts',
      icon: <BookOpen className="h-4 w-4" />,
      shortcut: '⌘A',
      action: () => navigate('/accounts'),
    },
    {
      id: 'customers',
      title: 'Customers',
      description: 'Manage customer information',
      icon: <Users className="h-4 w-4" />,
      shortcut: '⌘C',
      action: () => navigate('/sales/customers'),
    },
    {
      id: 'invoices',
      title: 'Sales Invoices',
      description: 'Create and manage invoices',
      icon: <FileText className="h-4 w-4" />,
      shortcut: '⌘I',
      action: () => navigate('/sales/invoices'),
    },
    {
      id: 'sales-items',
      title: 'Sales Items',
      description: 'Manage products and services',
      icon: <Package className="h-4 w-4" />,
      shortcut: '⌘S',
      action: () => navigate('/sales/items'),
    },
    {
      id: 'vendors',
      title: 'Vendors',
      description: 'Manage vendor information',
      icon: <Building2 className="h-4 w-4" />,
      shortcut: '⌘V',
      action: () => navigate('/purchases/vendors'),
    },
    {
      id: 'bills',
      title: 'Vendor Bills',
      description: 'Track vendor bills and expenses',
      icon: <ScrollText className="h-4 w-4" />,
      shortcut: '⌘B',
      action: () => navigate('/purchases/bills'),
    },
    {
      id: 'purchase-items',
      title: 'Purchase Items',
      description: 'Manage purchase items',
      icon: <Boxes className="h-4 w-4" />,
      shortcut: '⌘P',
      action: () => navigate('/purchases/items'),
    },
    {
      id: 'banking',
      title: 'Banking',
      description: 'View bank transactions',
      icon: <Wallet className="h-4 w-4" />,
      shortcut: '⌘T',
      action: () => navigate('/bank-transactions'),
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure application settings',
      icon: <SettingsIcon className="h-4 w-4" />,
      shortcut: '⌘,',
      action: () => navigate('/settings'),
    },
    {
      id: 'profile',
      title: 'Profile',
      description: 'Manage your profile',
      icon: <User className="h-4 w-4" />,
      shortcut: '⌘U',
      action: () => navigate('/profile'),
    },
  ] : [];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!session ? (
        <Routes>
          <Route path="/auth\" element={<Auth />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="*" element={<Navigate to="/auth\" replace />} />
        </Routes>
      ) : (
        <ShortcutBar items={shortcutItems}>
          <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
            <Navbar alerts={alerts} onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))} />
            <div className="flex flex-1">
              <Sidebar setNavigate={setNavigate} />
              <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/journals" element={<Journals />} />
                  <Route path="/sales/customers" element={<Customers />} />
                  <Route path="/sales/invoices" element={<Sales onAlert={addAlert} />} />
                  <Route path="/sales/items" element={<SalesItems />} />
                  <Route path="/purchases/vendors" element={<Vendors />} />
                  <Route path="/purchases/bills" element={<VendorBills />} />
                  <Route path="/bank-transactions" element={<BankTransactions onAlert={addAlert} />} />
                  <Route path="/purchases/items" element={<PurchaseItems />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route 
                    path="/profile" 
                    element={<Profile onAlert={addAlert} />} 
                  />
                  <Route path="*" element={<Navigate to="/dashboard\" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </ShortcutBar>
      )}
    </BrowserRouter>
  );
}

export default App;
