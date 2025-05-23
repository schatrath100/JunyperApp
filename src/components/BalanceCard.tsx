import React from 'react';
import { Eye, EyeOff, ArrowUpRight } from 'lucide-react';

interface BalanceCardProps {
  balance: number;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ balance }) => {
  const [showBalance, setShowBalance] = React.useState(true);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-900 dark:text-white font-semibold">Total Balance</span>
          <button 
            onClick={() => setShowBalance(!showBalance)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="mt-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {showBalance 
              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance)
              : '••••••'
            }
          </span>
          <span className="ml-2 text-sm text-green-500 dark:text-green-400">+2.4%</span>
        </div>
      </div>
    </div>
  );
};

export default BalanceCard;