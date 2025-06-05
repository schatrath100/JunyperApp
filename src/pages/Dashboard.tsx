import React, { useState, useEffect } from 'react';
import Greeting from '../components/Greeting';
import RecentActivity from '../components/RecentActivity';
import KPICard from '../components/KPICard';
import { SectionCards } from '../components/SectionCards';
import ExpensesChart from '../components/ExpensesChart';
import RevenueChart from '../components/RevenueChart';
import { supabase } from '../lib/supabase';

interface KPIData {
  value: number;
  change: number;
  trendData: number[];
}

const Dashboard: React.FC = () => {
  const [userName, setUserName] = useState('');
  const [salesKPI, setSalesKPI] = useState<KPIData>({ value: 0, change: 0, trendData: [0] });
  const [billsKPI, setBillsKPI] = useState<KPIData>({ value: 0, change: 0, trendData: [0] });
  const [newCustomersKPI, setNewCustomersKPI] = useState<KPIData>({ value: 0, change: 0, trendData: [0] });
  const [cashKPI, setCashKPI] = useState<KPIData>({ value: 0, change: 0, trendData: [0] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata.full_name;
        setUserName(fullName || 'User');
      }
    };

    getUser();
  }, []);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      
      // Get current month range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // Get this month's sales
      const { data: currentSales, error: salesError } = await supabase
        .from('SalesInvoice')
        .select('InvoiceAmount')
        .eq('user_id', user.id)
        .neq('Status', 'Cancelled')
        .gte('InvoiceDate', startOfMonth.toISOString())
        .lte('InvoiceDate', now.toISOString());
        
      if (salesError) throw salesError;

      // Get last month's sales
      const { data: lastSales } = await supabase
        .from('SalesInvoice')
        .select('InvoiceAmount')
        .eq('user_id', user.id)
        .neq('Status', 'Cancelled')
        .gte('InvoiceDate', startOfLastMonth.toISOString())
        .lte('InvoiceDate', endOfLastMonth.toISOString());

      const currentMonthSales = currentSales?.reduce((sum, inv) => sum + (Number(inv.InvoiceAmount) || 0), 0) || 0;
      const lastMonthSales = lastSales?.reduce((sum, inv) => sum + (Number(inv.InvoiceAmount) || 0), 0) || 0;
      const salesChange = lastMonthSales ? ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0;

      setSalesKPI({
        value: currentMonthSales,
        change: Math.round(salesChange * 10) / 10,
        trendData: [currentMonthSales]
      });

      // Get this month's bills
      const { data: currentBills, error: billsError } = await supabase
        .from('VendorInvoice')
        .select('Amount')
        .eq('user_id', user.id)
        .neq('Status', 'Cancelled')
        .gte('Date', startOfMonth.toISOString())
        .lte('Date', now.toISOString());

      if (billsError) throw billsError;

      // Get last month's bills
      const { data: lastBills } = await supabase
        .from('VendorInvoice')
        .select('Amount')
        .eq('user_id', user.id)
        .neq('Status', 'Cancelled')
        .gte('Date', startOfLastMonth.toISOString())
        .lte('Date', endOfLastMonth.toISOString());

      const currentMonthBills = currentBills?.reduce((sum, bill) => sum + (Number(bill.Amount) || 0), 0) || 0;
      const lastMonthBills = lastBills?.reduce((sum, bill) => sum + (Number(bill.Amount) || 0), 0) || 0;
      const billsChange = lastMonthBills ? ((currentMonthBills - lastMonthBills) / lastMonthBills) * 100 : 0;

      setBillsKPI({
        value: currentMonthBills,
        change: Math.round(billsChange * 10) / 10,
        trendData: [currentMonthBills]
      });

      // Get new customers this month
      const { data: currentCustomers, error: customersError } = await supabase
        .from('Customer')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', now.toISOString());

      if (customersError) throw customersError;

      // Get new customers last month
      const { data: lastCustomers } = await supabase
        .from('Customer')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString());

      const currentMonthCustomers = currentCustomers?.length || 0;
      const lastMonthCustomers = lastCustomers?.length || 0;
      const customersChange = lastMonthCustomers ? ((currentMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100 : 0;

      setNewCustomersKPI({
        value: currentMonthCustomers,
        change: Math.round(customersChange * 10) / 10,
        trendData: [currentMonthCustomers]
      });

      // Get current cash balance
      const { data: transactions, error: transactionsError } = await supabase
        .from('bank_transactions')
        .select('amount, credit_debit_indicator')
        .eq('user_id', user.id);

      if (transactionsError) throw transactionsError;

      const currentBalance = transactions?.reduce((balance, trans) => {
        const amount = Number(trans.amount) || 0;
        return balance + (trans.credit_debit_indicator === 'credit' ? amount : -amount);
      }, 0) || 0;

      // Calculate month-to-date change in cash balance
      const monthStartBalance = transactions?.reduce((balance, trans) => {
        if (new Date(trans.created_at) < startOfMonth) {
          const amount = Number(trans.amount) || 0;
          return balance + (trans.credit_debit_indicator === 'credit' ? amount : -amount);
        }
        return balance;
      }, 0) || 0;

      const cashChange = monthStartBalance ? ((currentBalance - monthStartBalance) / Math.abs(monthStartBalance)) * 100 : 0;

      setCashKPI({
        value: currentBalance,
        change: Math.round(cashChange * 10) / 10,
        trendData: [currentBalance]
      });

    } catch (err) {
      console.error('Error fetching KPI data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchKPIData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <Greeting name={userName} />  
      </div>
      
      <div className="mb-8">
        <SectionCards 
          salesKPI={salesKPI}
          billsKPI={billsKPI}
          newCustomersKPI={newCustomersKPI}
          cashKPI={cashKPI}
          loading={loading}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="animate-fade-in">
          <RevenueChart />
        </div>
        <div className="animate-fade-in [animation-delay:100ms]">
          <ExpensesChart />
        </div>
      </div>
      
      <div className="max-w-sm">
        <RecentActivity />
      </div>
    </div>
  );
};

export default Dashboard;