import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Button from './Button';

interface ActivityCount {
  type: string;
  count: number;
  previousCount: number;
  change: number;
}

type TimeRange = '1d' | '7d' | '30d';

const TIME_RANGE_LABELS = {
  '1d': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days'
};

const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<ActivityCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1d');

  const fetchRecentActivity = async (range: TimeRange) => {
    try {
      setLoading(true);
      setError(null);

      const startDate = new Date();
      const previousStartDate = new Date();
      let daysToSubtract = 1;

      switch (range) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          daysToSubtract = 7;
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          daysToSubtract = 30;
          break;
        default: // 1d
          startDate.setHours(startDate.getHours() - 24);
          daysToSubtract = 1;
      }

      // Set previous period dates
      previousStartDate.setDate(previousStartDate.getDate() - (daysToSubtract * 2));
      const previousEndDate = new Date(startDate);

      // Fetch new accounts count
      const { count: accountCount, error: accountError } = await supabase
        .from('Account')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: previousAccountCount } = await supabase
        .from('Account')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      if (accountError) throw accountError;

      // Fetch new customers count
      const { count: customerCount, error: customerError } = await supabase
        .from('Customer')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: previousCustomerCount } = await supabase
        .from('Customer')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      if (customerError) throw customerError;

      // Fetch new sales items count
      const { count: itemCount, error: itemError } = await supabase
        .from('SaleItems')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: previousItemCount } = await supabase
        .from('SaleItems')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      if (itemError) throw itemError;

      // Fetch new invoices count
      const { count: invoiceCount, error: invoiceError } = await supabase
        .from('SalesInvoice')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: previousInvoiceCount } = await supabase
        .from('SalesInvoice')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      if (invoiceError) throw invoiceError;

      // Fetch new bank transactions count
      const { count: transactionsCount, error: transactionsError } = await supabase
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: previousTransactionsCount } = await supabase
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      if (transactionsError) throw transactionsError;

      const newActivities: ActivityCount[] = [];
      
      if (accountCount && accountCount > 0) {
        newActivities.push({
          type: 'Accounts',
          count: accountCount,
          previousCount: previousAccountCount || 0,
          change: calculatePercentageChange(accountCount, previousAccountCount || 0)
        });
      }

      if (customerCount && customerCount > 0) {
        newActivities.push({
          type: 'Customers',
          count: customerCount,
          previousCount: previousCustomerCount || 0,
          change: calculatePercentageChange(customerCount, previousCustomerCount || 0)
        });
      }

      if (itemCount && itemCount > 0) {
        newActivities.push({
          type: 'Sales Items',
          count: itemCount,
          previousCount: previousItemCount || 0,
          change: calculatePercentageChange(itemCount, previousItemCount || 0)
        });
      }

      if (invoiceCount && invoiceCount > 0) {
        newActivities.push({
          type: 'Invoices',
          count: invoiceCount,
          previousCount: previousInvoiceCount || 0,
          change: calculatePercentageChange(invoiceCount, previousInvoiceCount || 0)
        });
      }

      if (transactionsCount && transactionsCount > 0) {
        newActivities.push({
          type: 'Bank Transactions',
          count: transactionsCount,
          previousCount: previousTransactionsCount || 0,
          change: calculatePercentageChange(transactionsCount, previousTransactionsCount || 0)
        });
      }

      setActivities(newActivities);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recent activity');
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number(((current - previous) / previous * 100).toFixed(1));
  };

  useEffect(() => {
    fetchRecentActivity(selectedRange);
    // Refresh data every 5 minutes
    const interval = setInterval(() => fetchRecentActivity(selectedRange), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedRange]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h2>
        <div className="flex space-x-2 text-sm">
          <button
            onClick={() => setSelectedRange('1d')}
            className={`px-2 py-1 rounded transition-colors ${
              selectedRange === '1d'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            1 day
          </button>
          <button
            onClick={() => setSelectedRange('7d')}
            className={`px-2 py-1 rounded transition-colors ${
              selectedRange === '7d'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setSelectedRange('30d')}
            className={`px-2 py-1 rounded transition-colors ${
              selectedRange === '30d'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            30 days
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="p-4 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 text-center text-red-500 dark:text-red-400">
          {error}
        </div>
      ) : activities.length === 0 ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p>No new activity in the {TIME_RANGE_LABELS[selectedRange]}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {activities.map((activity) => (
            <div key={activity.type} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div>
                <span className="text-gray-900 dark:text-white font-medium">New {activity.type}</span>
                <div className="flex items-center mt-1 space-x-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{activity.count}</span>
                  <div className={`flex items-center ${
                    activity.change > 0 
                      ? 'text-green-500 dark:text-green-400' 
                      : activity.change < 0 
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {activity.change > 0 ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    <span className="text-sm font-medium">
                      {activity.change > 0 ? '+' : ''}{activity.change}%
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm"
                onClick={() => {/* TODO: Implement view all functionality */}}
              >
                View All
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;