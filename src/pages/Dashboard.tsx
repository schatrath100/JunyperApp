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
  const [salesKPI, setSalesKPI] = useState<KPIData>({ value: 0, change: 0, trendData: [] });
  const [billsKPI, setBillsKPI] = useState<KPIData>({ value: 0, change: 0, trendData: [] });
  const [cashKPI, setCashKPI] = useState<KPIData>({ value: 0, change: 0, trendData: [] });
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
      const now = new Date();
      const fourWeeksAgo = new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000));

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      // Fetch sales invoice data
      const { data: salesData, error: salesError } = await supabase
        .from('SalesInvoice')
        .select('InvoiceAmount, InvoiceDate')
        .eq('user_id', user.id)
        .gte('InvoiceDate', fourWeeksAgo.toISOString())
        .order('InvoiceDate', { ascending: true });

      if (salesError) throw salesError;

      // Calculate weekly sales totals
      const weeklySales = Array(4).fill(0);
      let totalSales = 0;
      salesData?.forEach(invoice => {
        const weekIndex = 3 - Math.floor((now.getTime() - new Date(invoice.InvoiceDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weekIndex >= 0 && weekIndex < 4) {
          weeklySales[weekIndex] += Number(invoice.InvoiceAmount) || 0;
          totalSales += Number(invoice.InvoiceAmount) || 0;
        }
      });

      // Calculate sales change percentage
      const prevSales = weeklySales[2];
      const currentSales = weeklySales[3];
      const salesChange = prevSales ? ((currentSales - prevSales) / prevSales) * 100 : 0;

      setSalesKPI({
        value: totalSales,
        change: Math.round(salesChange * 10) / 10,
        trendData: weeklySales
      });

      // Fetch bank transactions for cash balance
      const { data: bankData, error: bankError } = await supabase
        .from('bank_transactions')
        .select('amount, credit_debit_indicator, date')
        .eq('user_id', user.id)
        .gte('date', fourWeeksAgo.toISOString())
        .order('date', { ascending: true });

      if (bankError) throw bankError;

      // Calculate weekly cash balances
      let runningBalance = 0;
      const weeklyBalances = Array(4).fill(0);
      
      bankData?.forEach(transaction => {
        const amount = Number(transaction.amount) || 0;
        runningBalance += transaction.credit_debit_indicator === 'credit' ? amount : -amount;
        
        const weekIndex = 3 - Math.floor((now.getTime() - new Date(transaction.date).getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weekIndex >= 0 && weekIndex < 4) {
          weeklyBalances[weekIndex] = runningBalance;
        }
      });

      // Calculate cash balance change percentage
      const prevBalance = weeklyBalances[2];
      const currentBalance = weeklyBalances[3];
      const balanceChange = prevBalance ? ((currentBalance - prevBalance) / prevBalance) * 100 : 0;

      setCashKPI({
        value: runningBalance,
        change: Math.round(balanceChange * 10) / 10,
        trendData: weeklyBalances
      });

      // Fetch vendor bills data
      const { data: billsData, error: billsError } = await supabase
        .from('VendorInvoice')
        .select('Amount, Date')
        .eq('user_id', user.id)
        .gte('Date', fourWeeksAgo.toISOString())
        .order('Date', { ascending: true });

      if (billsError) throw billsError;

      // Calculate weekly bills totals
      const weeklyBills = Array(4).fill(0);
      let totalBills = 0;
      billsData?.forEach(bill => {
        const weekIndex = 3 - Math.floor((now.getTime() - new Date(bill.Date).getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weekIndex >= 0 && weekIndex < 4) {
          weeklyBills[weekIndex] += Number(bill.Amount) || 0;
          totalBills += Number(bill.Amount) || 0;
        }
      });

      // Calculate bills change percentage
      const prevBills = weeklyBills[2];
      const currentBills = weeklyBills[3];
      const billsChange = prevBills ? ((currentBills - prevBills) / prevBills) * 100 : 0;

      setBillsKPI({
        value: totalBills,
        change: Math.round(billsChange * 10) / 10,
        trendData: weeklyBills
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