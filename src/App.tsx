import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import VerifyEmail from './pages/VerifyEmail';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ShortcutPanel from './components/ShortcutPanel';
import { supabase } from './lib/supabase';
import { Alert } from './components/Alert';

function App() {
  const mainRef = React.useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [session, setSession] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const addAlert = (message: string, type: Alert['type'] = 'info') => {
    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      createdAt: new Date(),
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  useEffect(() => {
    const handleShortcutSelected = () => setShowShortcuts(false);
    window.addEventListener('shortcutSelected', handleShortcutSelected);
    return () => window.removeEventListener('shortcutSelected', handleShortcutSelected);
  }, []);

  const handleMainClick = (e: React.MouseEvent) => {
    // Close if clicking on the main element or any of its direct children
    // that aren't inside the shortcut panel
    if (showShortcuts && mainRef.current?.contains(e.target as Node)) {
      setShowShortcuts(false);
    }
  };

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
          <Route path="/verify\" element={<VerifyEmail />} />
          <Route path="*" element={<Navigate to="/auth\" replace />} />
        </Routes>
      ) : (
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
          <Navbar alerts={alerts} onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))} />
          <div className="flex flex-1">
            <Sidebar 
              onToggleShortcuts={() => setShowShortcuts(!showShortcuts)} 
              showShortcuts={showShortcuts}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <main 
              ref={mainRef}
              className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800"
              onClick={handleMainClick}
            >
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
            {showShortcuts && <ShortcutPanel />}
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;