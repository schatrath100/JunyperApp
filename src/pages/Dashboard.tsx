import React, { useState, useEffect } from 'react';
import Greeting from '../components/Greeting';
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

      // Parallel execution of all queries for better performance
      const [
        currentSalesResult,
        lastSalesResult,
        currentBillsResult,
        lastBillsResult,
        currentCustomersResult,
        lastCustomersResult,
        transactionsResult
      ] = await Promise.all([
        // Current month sales - only select needed columns
        supabase
          .from('SalesInvoice')
          .select('InvoiceAmount')
          .eq('user_id', user.id)
          .neq('Status', 'Cancelled')
          .gte('InvoiceDate', startOfMonth.toISOString())
          .lte('InvoiceDate', now.toISOString()),
          
        // Last month sales
        supabase
          .from('SalesInvoice')
          .select('InvoiceAmount')
          .eq('user_id', user.id)
          .neq('Status', 'Cancelled')
          .gte('InvoiceDate', startOfLastMonth.toISOString())
          .lte('InvoiceDate', endOfLastMonth.toISOString()),
          
        // Current month bills - only select needed columns
        supabase
          .from('VendorInvoice')
          .select('Amount')
          .eq('user_id', user.id)
          .neq('Status', 'Cancelled')
          .gte('Date', startOfMonth.toISOString())
          .lte('Date', now.toISOString()),
          
        // Last month bills
        supabase
          .from('VendorInvoice')
          .select('Amount')
          .eq('user_id', user.id)
          .neq('Status', 'Cancelled')
          .gte('Date', startOfLastMonth.toISOString())
          .lte('Date', endOfLastMonth.toISOString()),
          
        // Current month customers - use count query for better performance
        supabase
          .from('Customer')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', now.toISOString()),
          
        // Last month customers
        supabase
          .from('Customer')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfLastMonth.toISOString())
          .lte('created_at', endOfLastMonth.toISOString()),
          
                 // Bank transactions - only select needed columns
         supabase
           .from('bank_transactions')
           .select('deposit, withdrawal, created_at')
           .eq('user_id', user.id)
           .eq('deleted', false)
      ]);

      // Handle errors from parallel queries
      if (currentSalesResult.error) throw currentSalesResult.error;
      if (lastSalesResult.error) throw lastSalesResult.error;
      if (currentBillsResult.error) throw currentBillsResult.error;
      if (lastBillsResult.error) throw lastBillsResult.error;
      if (currentCustomersResult.error) throw currentCustomersResult.error;
      if (lastCustomersResult.error) throw lastCustomersResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      // Process sales data
      const currentMonthSales = currentSalesResult.data?.reduce((sum, inv) => sum + (Number(inv.InvoiceAmount) || 0), 0) || 0;
      const lastMonthSales = lastSalesResult.data?.reduce((sum, inv) => sum + (Number(inv.InvoiceAmount) || 0), 0) || 0;
      const salesChange = lastMonthSales ? ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100 : 0;

      setSalesKPI({
        value: currentMonthSales,
        change: Math.round(salesChange * 10) / 10,
        trendData: [currentMonthSales]
      });

      // Process bills data
      const currentMonthBills = currentBillsResult.data?.reduce((sum, bill) => sum + (Number(bill.Amount) || 0), 0) || 0;
      const lastMonthBills = lastBillsResult.data?.reduce((sum, bill) => sum + (Number(bill.Amount) || 0), 0) || 0;
      const billsChange = lastMonthBills ? ((currentMonthBills - lastMonthBills) / lastMonthBills) * 100 : 0;

      setBillsKPI({
        value: currentMonthBills,
        change: Math.round(billsChange * 10) / 10,
        trendData: [currentMonthBills]
      });

      // Process customers data
      const currentMonthCustomers = currentCustomersResult.count || 0;
      const lastMonthCustomers = lastCustomersResult.count || 0;
      const customersChange = lastMonthCustomers ? ((currentMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100 : 0;

      setNewCustomersKPI({
        value: currentMonthCustomers,
        change: Math.round(customersChange * 10) / 10,
        trendData: [currentMonthCustomers]
      });

             // Process cash balance data - optimize calculation
       let currentBalance = 0;
       let monthStartBalance = 0;
       
       transactionsResult.data?.forEach(trans => {
         const deposit = Number(trans.deposit) || 0;
         const withdrawal = Number(trans.withdrawal) || 0;
         const netAmount = deposit - withdrawal;
         currentBalance += netAmount;
         
         // Only calculate month start balance if transaction is before current month
         if (new Date(trans.created_at) < startOfMonth) {
           monthStartBalance += netAmount;
         }
       });

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
    </div>
  );
};

export default Dashboard;