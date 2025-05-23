import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ActivityCount {
  type: string;
  count: number;
}

type TimeRange = '1d' | '7d' | '30d';

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
      switch (range) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default: // 1d
          startDate.setHours(startDate.getHours() - 24);
      }

      // Fetch new accounts count
      const { count: accountCount, error: accountError } = await supabase
        .from('Account')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      if (accountError) throw accountError;

      // Fetch new customers count
      const { count: customerCount, error: customerError } = await supabase
        .from('Customer')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      if (customerError) throw customerError;

      // Fetch new sales items count
      const { count: itemCount, error: itemError } = await supabase
        .from('SaleItems')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      if (itemError) throw itemError;

      // Fetch new invoices count
      const { count: invoiceCount, error: invoiceError } = await supabase
        .from('SalesInvoice')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      if (invoiceError) throw invoiceError;

      // Fetch new bank transactions count
      const { count: transactionsCount, error: transactionsError } = await supabase
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      if (transactionsError) throw transactionsError;

      const newActivities: ActivityCount[] = [];
      
      if (accountCount && accountCount > 0) {
        newActivities.push({
          type: 'Accounts',
          count: accountCount
        });
      }

      if (customerCount && customerCount > 0) {
        newActivities.push({
          type: 'Customers',
          count: customerCount
        });
      }

      if (itemCount && itemCount > 0) {
        newActivities.push({
          type: 'Sales Items',
          count: itemCount
        });
      }

      if (invoiceCount && invoiceCount > 0) {
        newActivities.push({
          type: 'Invoices',
          count: invoiceCount
        });
      }

      if (transactionsCount && transactionsCount > 0) {
        newActivities.push({
          type: 'Bank Transactions',
          count: transactionsCount
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
          <p>No new activity in the last 24 hours</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {activities.map((activity) => (
            <div key={activity.type} className="p-3 flex justify-between items-center">
              <span className="text-gray-900 dark:text-white font-medium">New {activity.type}</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{activity.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;