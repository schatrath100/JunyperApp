import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '../lib/utils';

interface FilterableTableHeadProps {
  label: string;
  sortKey?: string;
  filterKey: string;
  filterValue: string;
  filterType?: 'text' | 'date' | 'number' | 'select';
  onFilterChange: (key: string, value: string) => void;
  onSort?: (key: string) => void;
  sortDirection?: 'asc' | 'desc' | null;
  selectOptions?: { value: string; label: string }[];
}

const FilterableTableHead: React.FC<FilterableTableHeadProps> = ({
  label,
  sortKey,
  filterKey,
  filterValue,
  filterType = 'text',
  onFilterChange,
  onSort,
  sortDirection,
  selectOptions
}) => {
  const [open, setOpen] = useState(false);

  const handleFilterChange = (value: string) => {
    onFilterChange(filterKey, value);
  };

  const handleSort = () => {
    if (onSort && sortKey) {
      onSort(sortKey);
    }
  };

  const renderFilterInput = () => {
    switch (filterType) {
      case 'date':
        return (
          <input
            type="date"
            value={filterValue}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={filterValue}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
            placeholder={`Filter by ${label.toLowerCase()}`}
          />
        );
      case 'select':
        return (
          <select
            value={filterValue}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
          >
            <option value="">All</option>
            {selectOptions?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={filterValue}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-800 dark:text-white"
            placeholder={`Filter by ${label.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-left">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSort}
            className={cn(
              "text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors",
              sortDirection && "text-blue-600 dark:text-blue-400"
            )}
          >
            {label}
            {sortDirection && (
              <span className="ml-1">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </button>
          <Popover.Trigger asChild>
            <button
              className={cn(
                "p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                filterValue && "text-blue-600 dark:text-blue-400",
                !filterValue && "text-gray-400 dark:text-gray-600"
              )}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </Popover.Trigger>
        </div>

        <Popover.Portal>
          <Popover.Content
            className="w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50"
            align="start"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by {label}
                </span>
                {filterValue && (
                  <button
                    onClick={() => handleFilterChange('')}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {renderFilterInput()}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </th>
  );
};

export default FilterableTableHead;