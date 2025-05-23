import React from 'react';
import { ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react';
import { SortConfig } from '../hooks/useTableSort';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  sortConfig: SortConfig | null;
  onSort: (key: string) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  sortConfig,
  onSort,
}) => {
  const isSorted = sortConfig?.key === sortKey;
  const isAsc = isSorted && sortConfig?.direction === 'asc';

  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center space-x-1 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
    >
      <span>{label}</span>
      <span className="flex items-center">
        {isSorted ? (
          isAsc ? (
            <ArrowUpNarrowWide className="w-4 h-4" />
          ) : (
            <ArrowDownNarrowWide className="w-4 h-4" />
          )
        ) : (
          <ArrowUpNarrowWide className="w-4 h-4 opacity-0 group-hover:opacity-50" />
        )}
      </span>
    </button>
  );
};

export default SortableHeader;