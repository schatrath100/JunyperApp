import React from 'react';

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
        <div className="absolute w-2 h-2 bg-blue-500 rounded-full top-1 right-2"></div>
        <div className="absolute w-2 h-2 bg-blue-500 rounded-full bottom-1 left-2"></div>
        <div className="absolute w-2 h-2 bg-blue-500 rounded-full bottom-1 right-2"></div>
        <div className="absolute transform -rotate-45">
          <div className="w-4 h-6">
            <div className="w-1.5 h-3 bg-gray-800 dark:bg-gray-200 absolute left-0 transform -rotate-12"></div>
            <div className="w-1.5 h-3 bg-gray-800 dark:bg-gray-200 absolute right-0 transform rotate-12"></div>
          </div>
        </div>
      </div>
      <span className="text-lg font-bold text-gray-900 dark:text-white">Junyper</span>
    </div>
  );
};