import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface KPICardProps {
  title: string;
  value: number;
  change: number;
  trendData: number[];
  type: 'sales' | 'bills' | 'cash';
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, trendData = [], type }) => {
  const getBgColor = () => {
    switch (type) {
      case 'sales': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'bills': return 'bg-red-50 dark:bg-red-900/20';
      case 'cash': return 'bg-green-50 dark:bg-green-900/20';
      default: return 'bg-gray-50 dark:bg-gray-800';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'sales': return 'text-blue-500 dark:text-blue-400';
      case 'bills': return 'text-red-500 dark:text-red-400';
      case 'cash': return 'text-green-500 dark:text-green-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getChangeColor = () => {
    if (type === 'bills') {
      return change < 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
    }
    return change > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';
  };

  const maxValue = Math.max(...trendData, 1);
  const normalizedData = trendData.map(val => (val / maxValue) * 32);

  return (
    <div className={`rounded-lg p-6 ${getBgColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-700 dark:text-gray-200 font-medium">{title}</span>
        {change > 0 ? (
          <TrendingUp className={`w-5 h-5 ${getIconColor()}`} />
        ) : (
          <TrendingDown className={`w-5 h-5 ${getIconColor()}`} />
        )}
      </div>
      <div className="flex items-baseline mb-4">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            maximumFractionDigits: 0
          }).format(value)}
        </span>
        <span className={`ml-2 ${getChangeColor()} text-sm font-medium`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
      </div>
      
      <div className="h-8 flex items-end space-x-1">
        {normalizedData.map((height, index) => (
          <div 
            key={index}
            className={`w-1.5 ${getIconColor()} opacity-70 rounded-t transition-all duration-300`}
            style={{ height: `${height}px` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default KPICard;