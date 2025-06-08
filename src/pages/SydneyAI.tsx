import React from 'react';

const SydneyAI: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sydney AI</h1>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Welcome to Sydney AI
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Your AI-powered accounting assistant is coming soon!
          </p>
        </div>
      </div>
    </div>
  );
};

export default SydneyAI; 