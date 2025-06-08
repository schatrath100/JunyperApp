import React from 'react';

const Invoices: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          New Invoice
        </button>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Invoices
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your customer invoices here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoices; 