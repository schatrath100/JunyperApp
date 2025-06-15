import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock, Unlock } from 'lucide-react';
import { cn } from '../lib/utils';

interface Account {
  id: number;
  account_name: string;
  account_type: string;
  isSystemAccount?: boolean;
}

interface AccountSelectProps {
  accounts: Account[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  accountType?: string;
  filterCondition?: (account: Account) => boolean;
}

const AccountSelect: React.FC<AccountSelectProps> = ({
  accounts,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  accountType,
  filterCondition
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, top: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter accounts based on type and custom condition
  const filteredAccounts = accounts.filter(account => {
    const typeMatch = accountType ? account.account_type === accountType : true;
    const conditionMatch = filterCondition ? filterCondition(account) : true;
    return typeMatch && conditionMatch;
  });

  const selectedAccount = accounts.find(account => account.id === value);

  const updateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        left: rect.left,
        top: rect.bottom + 4,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const handleSelect = (accountId: number) => {
    onChange(accountId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={cn(
          "w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white cursor-pointer flex items-center justify-between",
          disabled && "bg-gray-50 dark:bg-gray-700 cursor-not-allowed opacity-50",
          className
        )}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) {
              updateDropdownPosition();
            }
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedAccount ? (
            <>
              {selectedAccount.isSystemAccount ? (
                <Lock className="w-3 h-3 text-red-500 flex-shrink-0" strokeWidth={2.5} />
              ) : (
                <Unlock className="w-3 h-3 text-green-500 flex-shrink-0" strokeWidth={2.5} />
              )}
              <span className="truncate">{selectedAccount.account_name}</span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-hidden" 
             style={{
               left: dropdownPosition.left,
               top: dropdownPosition.top,
               width: dropdownPosition.width
             }}>
          <div className="max-h-60 overflow-y-auto">
            {filteredAccounts.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No accounts found
              </div>
            ) : (
              filteredAccounts.map(account => (
                <div
                  key={account.id}
                  className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
                  onClick={() => handleSelect(account.id)}
                >
                  {account.isSystemAccount ? (
                    <Lock className="w-3 h-3 text-red-500 flex-shrink-0" strokeWidth={2.5} />
                  ) : (
                    <Unlock className="w-3 h-3 text-green-500 flex-shrink-0" strokeWidth={2.5} />
                  )}
                  <span className="flex-1 truncate">{account.account_name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {account.isSystemAccount ? 'System' : 'Custom'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSelect; 