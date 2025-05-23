import React from 'react';
import MetricCard from './MetricCard';

const MetricsSection: React.FC = () => {
  const incomeData = [35, 42, 38, 45, 40, 50, 55, 60];
  const expensesData = [25, 30, 28, 22, 24, 27, 30, 28];
  const profitData = [10, 12, 10, 23, 16, 23, 25, 32];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Overview</h2>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            title="Income"
            value={58900}
            change={12.5}
            data={incomeData}
            type="income"
          />
          <MetricCard
            title="Expenses"
            value={24500}
            change={-3.2}
            data={expensesData}
            type="expenses"
          />
          <MetricCard
            title="Profit"
            value={34400}
            change={18.3}
            data={profitData}
            type="profit"
          />
        </div>
      </div>
    </div>
  );
};

export default MetricsSection;