import React, { useEffect, useState } from 'react';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAccessItem {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
}

const QuickAccess: React.FC = () => {
  const navigate = useNavigate();
  const [quickAccessItems, setQuickAccessItems] = useState<QuickAccessItem[]>([]);

  useEffect(() => {
    // Fetch quick access items from the backend
    // This is a placeholder and should be replaced with actual data fetching logic
    setQuickAccessItems([
      {
        title: 'Item 1',
        description: 'Description for Item 1',
        path: '/item1',
        icon: ChevronRight,
      },
      {
        title: 'Item 2',
        description: 'Description for Item 2',
        path: '/item2',
        icon: ChevronRight,
      },
      {
        title: 'Item 3',
        description: 'Description for Item 3',
        path: '/item3',
        icon: ChevronRight,
      },
    ]);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {quickAccessItems.map((item) => (
        <button
          key={item.title}
          onClick={() => navigate(item.path)}
          className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative p-6 flex items-center space-x-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <item.icon className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                {item.description}
              </p>
            </div>
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
              <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default QuickAccess; 