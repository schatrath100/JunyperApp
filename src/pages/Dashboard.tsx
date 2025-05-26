import React, { useState, useEffect } from 'react';
import Greeting from '../components/Greeting';
import RecentActivity from '../components/RecentActivity';
import KPICard from '../components/KPICard';
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

      // Fetch sales invoice data
      const { data: salesData, error: salesError } = await supabase
        .from('SalesInvoice')
        .select('InvoiceAmount, InvoiceDate')
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

      // For demo purposes, set bills KPI with mock data
      // In a real implementation, this would fetch from a vendor bills table
      setBillsKPI({
        value: 45000,
        change: -2.5,
        trendData: [42000, 44000, 43000, 45000]
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="animate-fade-in">
          <KPICard
            title="Total Sales"
            value={salesKPI.value}
            change={salesKPI.change}
            trendData={salesKPI.trendData}
            type="sales"
          />
        </div>
        <div className="animate-fade-in [animation-delay:100ms]">
          <KPICard
            title="Total Bills"
            value={billsKPI.value}
            change={billsKPI.change}
            trendData={billsKPI.trendData}
            type="bills"
          />
        </div>
        <div className="animate-fade-in [animation-delay:200ms]">
          <KPICard
            title="Cash Balance"
            value={cashKPI.value}
            change={cashKPI.change}
            trendData={cashKPI.trendData}
            type="cash"
          />
        </div>
      </div>
      
      <div className="max-w-sm">
        <RecentActivity />
      </div>
    </div>
  );
};

export default Dashboard;