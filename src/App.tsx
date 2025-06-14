import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Sales from './pages/Sales';
import Journals from './pages/Journals';
import SalesItems from './pages/SalesItems';
import Customers from './pages/Customers';
import BankTransactions from './pages/BankTransactions';
import BankingSetup from './pages/BankingSetup';
import Settings from './pages/Settings';
import PurchaseItems from './pages/PurchaseItems';
import Vendors from './pages/Vendors';
import VendorBills from './pages/VendorBills';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import VerifyEmail from './pages/VerifyEmail';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import SlideInPanel from './components/SlideInPanel';
import { supabase } from './lib/supabase';
import { Alert } from './components/Alert';
import SydneyAI from './pages/SydneyAI';
import { ToastProvider, ToastViewport } from './components/ui/toast';
import { useNotifications } from './hooks/useNotifications';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import { Session } from '@supabase/supabase-js';


function App() {
  const mainRef = React.useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [session, setSession] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  
  // Use the new notification system
  const { 
    unreadNotifications, 
    unreadCount, 
    markAsRead, 
    dismiss,
    markAllAsRead,
    createTestNotification
  } = useNotifications();

  // Session timeout hook
  const sessionTimeout = useSessionTimeout(
    () => {
      // Handle timeout - user will be logged out automatically by the hook
      console.log('Session timed out - user logged out');
    },
    () => {
      // Handle warning - show the warning modal
      setShowTimeoutWarning(true);
    }
  );

  // Expose test function to window for debugging
  React.useEffect(() => {
    (window as any).createTestNotification = createTestNotification;
  }, [createTestNotification]);

  const addAlert = (message: string, type: Alert['type'] = 'info') => {
    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      createdAt: new Date(),
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleMainClick = (e: React.MouseEvent) => {
    // Click handler for main content area
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
    <ToastProvider>
      <BrowserRouter>
        {!session ? (
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        ) : (
          <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
            <Navbar 
              notifications={unreadNotifications} 
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onDismiss={dismiss}
              onMarkAllAsRead={markAllAsRead}
            />
            <div className="flex flex-1 relative">
              <Sidebar 
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
              <main 
                ref={mainRef}
                className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 h-[calc(100vh-4rem)] ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-56'} transition-all duration-300`}
                onClick={handleMainClick}
              >
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/sales/invoices" element={<Sales />} />
                  <Route path="/journals" element={<Journals />} />
                  <Route path="/sales/items" element={<SalesItems />} />
                  <Route path="/sales/customers" element={<Customers />} />
                  <Route path="/bank-transactions" element={<BankTransactions onAlert={addAlert} />} />
                  <Route path="/banking/setup" element={<BankingSetup onAlert={addAlert} />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/purchases/items" element={<PurchaseItems />} />
                  <Route path="/purchases/vendors" element={<Vendors />} />
                  <Route path="/purchases/bills" element={<VendorBills />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/sydney-ai" element={<SydneyAI />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
            <SlideInPanel />
          </div>
        )}
        
        {/* Session Timeout Warning Modal */}
        <SessionTimeoutWarning
          isOpen={showTimeoutWarning}
          onExtendSession={() => {
            setShowTimeoutWarning(false);
            sessionTimeout.extendSession();
          }}
          onLogoutNow={() => {
            setShowTimeoutWarning(false);
            sessionTimeout.logoutNow();
          }}
        />
      </BrowserRouter>
      <ToastViewport />
    </ToastProvider>
  );
}

export default App;
