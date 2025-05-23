import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  data?: number[];
  type: 'income' | 'expenses' | 'profit';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, data = [], type }) => {
  const getBgColor = () => {
    switch (type) {
      case 'income': return 'bg-green-50 dark:bg-green-900/20';
      case 'expenses': return 'bg-red-50 dark:bg-red-900/20';
      case 'profit': return 'bg-blue-50 dark:bg-blue-900/20';
      default: return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'income': return 'text-green-500 dark:text-green-400';
      case 'expenses': return 'text-red-500 dark:text-red-400';
      case 'profit': return 'text-blue-500 dark:text-blue-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getChangeColor = () => {
    if (type === 'expenses') {
      return change < 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
    }
    return change > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
  };

  const formattedValue = new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

  const formattedChange = `${change > 0 ? '+' : ''}${change}%`;

  const maxValue = Math.max(...data, 1);
  const normalizedData = data.map(val => (val / maxValue) * 32);

  return (
    <div className={`rounded-lg p-4 ${getBgColor()}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-700 dark:text-gray-200 font-medium">{title}</span>
        {type === 'income' || type === 'profit' ? (
          <TrendingUp className={`w-5 h-5 ${getIconColor()}`} />
        ) : (
          <TrendingDown className={`w-5 h-5 ${getIconColor()}`} />
        )}
      </div>
      <div className="flex items-baseline mb-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{formattedValue}</span>
        <span className={`ml-2 ${getChangeColor()} text-sm font-medium`}>{formattedChange}</span>
      </div>
      
      <div className="h-8 flex items-end space-x-1">
        {normalizedData.map((height, index) => (
          <div 
            key={index}
            className={`w-1.5 ${getIconColor()} opacity-70 rounded-t`}
            style={{ height: `${height}px` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default MetricCard;