import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from '../lib/supabase';

interface MonthlyExpenses {
  month: string;
  expenses: number;
}

export default function ExpensesChart() {
  const [chartData, setChartData] = useState<MonthlyExpenses[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState({ percentage: 0, isUp: true });

  useEffect(() => {
    const fetchExpensesData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');

        // Get last 6 months of vendor bills
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 5); // Get 6 months including current

        const { data: bills, error } = await supabase
          .from('VendorInvoice')
          .select('Amount, Date')
          .eq('user_id', user.id)
          .neq('Status', 'Cancelled')
          .gte('Date', startDate.toISOString())
          .lte('Date', endDate.toISOString());

        if (error) throw error;

        // Process bills into monthly totals
        const monthlyData = new Map<string, number>();
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

        // Initialize last 6 months with 0
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          monthlyData.set(months[d.getMonth()], 0);
        }

        // Sum up bill amounts by month
        bills?.forEach(bill => {
          const date = new Date(bill.Date);
          const month = months[date.getMonth()];
          monthlyData.set(month, (monthlyData.get(month) || 0) + Number(bill.Amount));
        });

        // Convert to chart data format
        const chartData = Array.from(monthlyData.entries()).map(([month, expenses]) => ({
          month,
          expenses
        }));

        // Calculate trend percentage
        const currentMonth = chartData[chartData.length - 1].expenses;
        const previousMonth = chartData[chartData.length - 2].expenses;
        const trendPercentage = previousMonth === 0 ? 100 :
          ((currentMonth - previousMonth) / previousMonth) * 100;

        setChartData(chartData);
        setTrend({
          percentage: Math.abs(Math.round(trendPercentage * 10) / 10),
          isUp: trendPercentage >= 0
        });

      } catch (err) {
        console.error('Error fetching expenses data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExpensesData();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl shadow-md bg-white dark:bg-gray-900 p-6 w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl shadow-md bg-white dark:bg-gray-900 p-6 w-full">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Expenses Trend</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Last 6 months</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <Tooltip 
              cursor={{ fill: "transparent" }}
              formatter={(value: number) => [
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(value),
                "Expenses"
              ]}
            />
            <Bar dataKey="expenses" fill="#ef4444" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <div className="flex items-center gap-2 font-medium">
          {trend.isUp ? (
            <>
              Trending up by {trend.percentage}% this month
              <TrendingUp className="h-4 w-4 text-red-500" />
            </>
          ) : (
            <>
              Trending down by {trend.percentage}% this month
              <TrendingDown className="h-4 w-4 text-green-500" />
            </>
          )}
        </div>
        <div>Monthly expenses from non-cancelled bills</div>
      </div>
    </div>
  );
}