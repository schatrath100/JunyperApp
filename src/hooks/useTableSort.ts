import React from 'react';
import { useState, useEffect } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function useTableSort<T>(
  items: T[],
  defaultSort?: SortConfig
): {
  sortedItems: T[];
  sortConfig: SortConfig | null;
  requestSort: (key: string) => void;
} {
  // Load saved sort config from localStorage
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(() => {
    const saved = localStorage.getItem('tableSortConfig');
    return saved ? JSON.parse(saved) : defaultSort || null;
  });

  useEffect(() => {
    if (sortConfig) {
      localStorage.setItem('tableSortConfig', JSON.stringify(sortConfig));
    }
  }, [sortConfig]);

  const sortedItems = React.useMemo(() => {
    if (!sortConfig) return items;

    return [...items].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T];
      const bValue = b[sortConfig.key as keyof T];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      return sortConfig.direction === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    setSortConfig((prevConfig) => {
      if (!prevConfig || prevConfig.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prevConfig.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  return { sortedItems, sortConfig, requestSort };
}