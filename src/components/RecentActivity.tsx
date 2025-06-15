import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, FileText, Receipt, Wallet, UserPlus, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface ActivityCount {
  type: string;
  count: number;
  previousCount: number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

type TimeRange = '1d' | '7d' | '30d';

interface RecentActivityProps {
  compact?: boolean;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ compact = false }) => {
  const [activities, setActivities] = useState<ActivityCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1d');

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Accounts':
        return <Building2 className="w-5 h-5" />;
      case 'Invoices':
        return <FileText className="w-5 h-5" />;
      case 'Bank Transactions':
        return <Wallet className="w-5 h-5" />;
      case 'Bills':
        return <Receipt className="w-5 h-5" />;
      case 'Customers':
        return <UserPlus className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'Accounts':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case 'Invoices':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
      case 'Bank Transactions':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
      case 'Bills':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300';
      case 'Customers':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300';
    }
  };

  const fetchRecentActivity = async (range: TimeRange) => {
    try {
      setLoading(true);
      setError(null);

      let startDate = new Date();
      let previousStartDate = new Date();
      let daysToSubtract = 1;

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      switch (range) {
        case '7d':
          startDate = new Date();
          previousStartDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          daysToSubtract = 7;
          break;
        case '30d':
          startDate = new Date();
          previousStartDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          daysToSubtract = 30;
          break;
        default: // 1d
          startDate = new Date();
          previousStartDate = new Date();
          startDate.setHours(startDate.getHours() - 24);
          daysToSubtract = 1;
      }

      // Set previous period dates
      previousStartDate.setDate(previousStartDate.getDate() - (daysToSubtract * 2));
      const previousEndDate = new Date(startDate);

      // Fetch new accounts count
      const { count: accountCount, error: accountError } = await supabase
        .from('userDefinedAccounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      const { count: previousAccountCount } = await supabase
        .from('userDefinedAccounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      if (accountError) throw accountError;

      // Fetch new invoices count
      const { count: invoiceCount, error: invoiceError } = await supabase
        .from('SalesInvoice')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      const { count: previousInvoiceCount } = await supabase
        .from('SalesInvoice')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      if (invoiceError) throw invoiceError;

      // Fetch new bank transactions count
      const { count: transactionsCount, error: transactionsError } = await supabase
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      const { count: previousTransactionsCount } = await supabase
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      if (transactionsError) throw transactionsError;

      // Fetch new bills count
      const { count: billsCount, error: billsError } = await supabase
        .from('VendorInvoice')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      const { count: previousBillsCount } = await supabase
        .from('VendorInvoice')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', previousEndDate.toISOString());

      if (billsError) throw billsError;

      const newActivities: ActivityCount[] = [];
      
      if (accountCount && accountCount > 0) {
        newActivities.push({
          type: 'Accounts',
          count: accountCount,
          previousCount: previousAccountCount || 0,
          change: calculatePercentageChange(accountCount, previousAccountCount || 0),
          icon: getActivityIcon('Accounts'),
          color: getActivityColor('Accounts')
        });
      }

      if (invoiceCount && invoiceCount > 0) {
        newActivities.push({
          type: 'Invoices',
          count: invoiceCount,
          previousCount: previousInvoiceCount || 0,
          change: calculatePercentageChange(invoiceCount, previousInvoiceCount || 0),
          icon: getActivityIcon('Invoices'),
          color: getActivityColor('Invoices')
        });
      }

      if (transactionsCount && transactionsCount > 0) {
        newActivities.push({
          type: 'Bank Transactions',
          count: transactionsCount,
          previousCount: previousTransactionsCount || 0,
          change: calculatePercentageChange(transactionsCount, previousTransactionsCount || 0),
          icon: getActivityIcon('Bank Transactions'),
          color: getActivityColor('Bank Transactions')
        });
      }
      
      if (billsCount && billsCount > 0) {
        newActivities.push({
          type: 'Bills',
          count: billsCount,
          previousCount: previousBillsCount || 0,
          change: calculatePercentageChange(billsCount, previousBillsCount || 0),
          icon: getActivityIcon('Bills'),
          color: getActivityColor('Bills')
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
    <div className={cn(
      "bg-white dark:bg-gray-900 flex flex-col",
      compact 
        ? "h-full" // Full height when compact to enable proper scrolling
        : "rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
    )}>
      <div className={cn(
        "flex items-center justify-between border-b border-gray-200 dark:border-gray-700 flex-shrink-0",
        compact ? "p-3" : "p-4"
      )}>
        <h2 className={cn(
          "font-semibold text-gray-900 dark:text-white",
          compact ? "text-sm" : "text-lg"
        )}>
          Recent Activity
        </h2>
        <div className="flex space-x-1 text-xs">
          <button
            onClick={() => setSelectedRange('1d')}
            className={cn(
              "rounded-full transition-colors",
              compact ? "px-1.5 py-0.5" : "px-2 py-1",
              selectedRange === '1d'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            1d
          </button>
          <button
            onClick={() => setSelectedRange('7d')}
            className={cn(
              "rounded-full transition-colors",
              compact ? "px-1.5 py-0.5" : "px-2 py-1",
              selectedRange === '7d'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            7d
          </button>
          <button
            onClick={() => setSelectedRange('30d')}
            className={cn(
              "rounded-full transition-colors",
              compact ? "px-1.5 py-0.5" : "px-2 py-1",
              selectedRange === '30d'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            30d
          </button>
        </div>
      </div>
      
      <div className={cn(
        "flex-1 overflow-y-auto",
        compact ? "min-h-0" : ""
      )}>
        {loading ? (
          <div className={cn("flex justify-center", compact ? "p-3" : "p-4")}>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className={cn("text-center text-red-500 dark:text-red-400", compact ? "p-3 text-xs" : "p-4")}>
            {error}
          </div>
        ) : activities.length === 0 ? (
          <div className={cn("text-center text-gray-500 dark:text-gray-400", compact ? "p-3" : "p-4")}>
            <p className={compact ? "text-xs" : ""}>No new activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <AnimatePresence>
            {activities.map((activity) => (
                <motion.div
                  key={activity.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                    compact ? "p-2" : "p-4"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "rounded-lg",
                        compact ? "p-1.5" : "p-2",
                        activity.color
                      )}>
                        <div className={compact ? "w-3 h-3" : "w-5 h-5"}>
                          {activity.icon}
                        </div>
                      </div>
                      <div>
                        <span className={cn(
                          "text-gray-900 dark:text-white font-medium",
                          compact ? "text-xs" : "text-sm"
                        )}>
                          New {activity.type}
                        </span>
                        <div className={cn(
                          "text-gray-500 dark:text-gray-400",
                          compact ? "text-xs" : "text-sm"
                        )}>
                          {activity.count} {activity.count === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center",
                      activity.change > 0 
                        ? 'text-green-500 dark:text-green-400' 
                        : activity.change < 0 
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-gray-400 dark:text-gray-500'
                    )}>
                      {activity.change > 0 ? (
                        <TrendingUp className={cn(compact ? "w-3 h-3 mr-0.5" : "w-4 h-4 mr-1")} />
                      ) : (
                        <TrendingDown className={cn(compact ? "w-3 h-3 mr-0.5" : "w-4 h-4 mr-1")} />
                      )}
                      <span className={cn(
                        "font-medium",
                        compact ? "text-xs" : "text-sm"
                      )}>
                        {activity.change > 0 ? '+' : ''}{activity.change}%
                      </span>
                    </div>
                  </div>
                </motion.div>
            ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;