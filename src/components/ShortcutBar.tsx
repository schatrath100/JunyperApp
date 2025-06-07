'use client';

import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
} from 'react';
import {
  Command,
  Search,
  Home,
  Settings,
  User,
  FileText,
  Mail,
  Calendar,
  X,
  ChevronRight,
  Users,
  Receipt,
  Package,
  Building2,
  ScrollText,
  Boxes,
  Wallet,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface ShortcutItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface ShortcutBarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const ShortcutBarContext = createContext<ShortcutBarContextType | undefined>(
  undefined
);

function useShortcutBar() {
  const context = useContext(ShortcutBarContext);
  if (!context) {
    throw new Error('useShortcutBar must be used within a ShortcutBarProvider');
  }
  return context;
}

function ShortcutBarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <ShortcutBarContext.Provider
      value={{ isOpen, setIsOpen, searchQuery, setSearchQuery }}
    >
      {children}
    </ShortcutBarContext.Provider>
  );
}

function ShortcutBarTrigger() {
  const { setIsOpen } = useShortcutBar();

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
    >
      <Search className="h-4 w-4" />
      <span>Search...</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-gray-100 dark:bg-gray-700 px-1.5 font-mono text-[10px] font-medium text-gray-500 dark:text-gray-400 opacity-100">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}

function ShortcutBarContent({ items }: { items: ShortcutItem[] }) {
  const { isOpen, setIsOpen, searchQuery, setSearchQuery } = useShortcutBar();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
            setIsOpen(false);
            setSearchQuery('');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, setIsOpen, setSearchQuery]);

  const slideX = useMotionValue(0);
  const slideSpring = useSpring(slideX, { stiffness: 300, damping: 30 });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ x: slideSpring }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 p-4">
                <Command className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a command or search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className="rounded-sm p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {filteredItems.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No results found.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredItems.map((item, index) => (
                      <motion.button
                        key={item.id}
                        onClick={() => {
                          item.action();
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                        className={cn(
                          'group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                          index === selectedIndex
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                        {item.shortcut && (
                          <kbd className="hidden group-hover:inline-flex h-5 select-none items-center gap-1 rounded border bg-gray-100 dark:bg-gray-700 px-1.5 font-mono text-[10px] font-medium text-gray-500 dark:text-gray-400">
                            {item.shortcut}
                          </kbd>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Navigate with ↑↓</span>
                  <span>Select with ↵</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ShortcutBar({ items }: { items: ShortcutItem[] }) {
  return (
    <ShortcutBarProvider>
      <ShortcutBarContent items={items} />
    </ShortcutBarProvider>
  );
}

export function ShortcutBarTriggerButton() {
  return <ShortcutBarTrigger />;
}

export type { ShortcutItem };