import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Landmark, RefreshCw, Download, Calendar, Settings, Save, Edit2, Search, Eye, Info } from 'lucide-react';
import Button from '../components/Button';
import { cn } from '../lib/utils';
import type { Alert } from '../components/Alert';
import { usePlaidLink } from 'react-plaid-link';
import { format, subDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

interface ConnectedBank {
  id: string;
  user_id: string;
  item_id: string;
  access_token: string;
  institution_name: string;
  created_at: string;
  updated_at: string;
}

interface TransactionRule {
  id: string;
  user_id: string;
  name: string;
  amount_min?: number;
  amount_max?: number;
  description_contains?: string;
  bank_name?: string;
  action: string;
  account_mapping?: string;
  created_at: string;
  updated_at: string;
}

interface BankingSetupProps {
  onAlert?: (message: string, type: Alert['type']) => void;
}

// Singleton for Plaid Link initialization
let plaidLinkInstance: any = null;

const PlaidLinkButton = ({ onAlert }: { onAlert?: (message: string, type: Alert['type']) => void }) => {
  const { user } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const plaidInitialized = useRef(false);
  const mounted = useRef(true);
  const initializationAttempted = useRef(false);
  const linkTokenRef = useRef<string | null>(null);
  const tokenExpirationRef = useRef<number | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const initializePlaid = async () => {
    if (isInitializing || !mounted.current || !user) {
      return;
    }

    try {
      setIsInitializing(true);
      console.log('Creating link token...');
      const response = await fetch('http://localhost:3001/api/create_link_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create link token');
      }

      const data = await response.json();
      console.log('Link token created:', { success: !!data.link_token });
      
      if (mounted.current) {
        linkTokenRef.current = data.link_token;
        setLinkToken(data.link_token);
        plaidInitialized.current = true;
        tokenExpirationRef.current = Date.now() + 30 * 60 * 1000;
      }
    } catch (err) {
      console.error('Error creating link token:', err);
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Plaid');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  // Initialize Plaid only once when component mounts
  useEffect(() => {
    if (!plaidLinkInstance && !initializationAttempted.current && user) {
      initializationAttempted.current = true;
      initializePlaid();
    }
  }, [user]);

  // Check token expiration
  useEffect(() => {
    const checkTokenExpiration = () => {
      if (tokenExpirationRef.current && Date.now() >= tokenExpirationRef.current) {
        console.log('Link token expired, refreshing...');
        initializePlaid();
      }
    };

    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token: string, metadata: any) => {
      console.log('Plaid Link success:', { public_token, metadata });
      try {
        // Get the authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Error getting user:', userError);
          throw new Error('Failed to get authenticated user');
        }

        // Exchange the public token
        const response = await fetch('http://localhost:3001/api/exchange_public_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_token,
            metadata,
            userId: user.id,
            institutionName: metadata.institution?.name || 'Unknown Institution'
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error response:', errorData);
          throw new Error(errorData.details || 'Failed to exchange public token');
        }

        onAlert?.('Bank account connected successfully!', 'success');
        // Clear the link token to prevent multiple initializations
        setLinkToken(null);
        linkTokenRef.current = null;
        plaidInitialized.current = false;
        
        // Trigger parent to refresh connected banks
        window.dispatchEvent(new CustomEvent('bankConnected'));
      } catch (error) {
        console.error('Error exchanging public token:', error);
        onAlert?.('Failed to connect bank account. Please try again.', 'error');
        throw error;
      }
    },
    onExit: (err, metadata) => {
      console.log('Plaid Link exit:', { err, metadata });
      // Clear the link token on exit
      setLinkToken(null);
      linkTokenRef.current = null;
      plaidInitialized.current = false;
    },
  });

  const handleClick = async () => {
    if (!ready) {
      console.log('Plaid Link not ready');
      return;
    }

    try {
      await open();
    } catch (error) {
      console.error('Error opening Plaid Link:', error);
      setError(error instanceof Error ? error.message : 'Failed to open Plaid Link');
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={!ready || isInitializing}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
    >
      <Plus className="h-4 w-4" />
      {isInitializing ? 'Connecting...' : 'Connect Bank Account'}
    </Button>
  );
};

const BankingSetup: React.FC<BankingSetupProps> = ({ onAlert }) => {
  const [connectedBanks, setConnectedBanks] = useState<ConnectedBank[]>([]);
  const [transactionRules, setTransactionRules] = useState<TransactionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<TransactionRule | null>(null);
  const [hoveredRule, setHoveredRule] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    amount_min: '',
    amount_max: '',
    description_contains: '',
    bank_name: '',
    action: 'reconcile',
    account_mapping: ''
  });
  
  const { createNotification } = useNotifications();

  // Function to fetch connected banks
  const fetchConnectedBanks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('connected_banks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnectedBanks(data || []);
    } catch (err) {
      console.error('Error fetching connected banks:', err);
      onAlert?.('Failed to fetch connected banks', 'error');
    }
  };

  // Function to fetch transaction rules (active only)
  const fetchTransactionRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('active_transaction_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactionRules(data || []);
    } catch (err) {
      console.error('Error fetching transaction rules:', err);
      onAlert?.('Failed to fetch transaction rules', 'error');
    }
  };

  // Handle rule form submission
  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const ruleData = {
        user_id: user.id,
        name: ruleForm.name,
        amount_min: ruleForm.amount_min ? parseFloat(ruleForm.amount_min) : null,
        amount_max: ruleForm.amount_max ? parseFloat(ruleForm.amount_max) : null,
        description_contains: ruleForm.description_contains || null,
        bank_name: ruleForm.bank_name || null,
        action: ruleForm.action,
        account_mapping: ruleForm.account_mapping || null,
      };

      if (editingRule) {
        const { error } = await supabase
          .from('transaction_rules')
          .update(ruleData)
          .eq('id', editingRule.id);
        
        if (error) throw error;
        
        // Create notification for rule update
        await createNotification({
          title: 'Transaction Rule Updated',
          message: `Transaction rule "${ruleForm.name}" has been updated successfully.`,
          type: 'success',
          metadata: { rule_id: editingRule.id, rule_name: ruleForm.name, action: 'updated' },
          related_table: 'transaction_rules',
          related_id: editingRule.id
        });
        
        onAlert?.('Transaction rule updated successfully', 'success');
      } else {
        const { data, error } = await supabase
          .from('transaction_rules')
          .insert([ruleData])
          .select()
          .single();
        
        if (error) throw error;
        
        // Create notification for new rule
        await createNotification({
          title: 'Transaction Rule Created',
          message: `New transaction rule "${ruleForm.name}" has been created successfully.`,
          type: 'success',
          metadata: { rule_id: data.id, rule_name: ruleForm.name, action: 'created' },
          related_table: 'transaction_rules',
          related_id: data.id
        });
        
        onAlert?.('Transaction rule created successfully', 'success');
      }

      // Reset form
      setRuleForm({
        name: '',
        amount_min: '',
        amount_max: '',
        description_contains: '',
        bank_name: '',
        action: 'reconcile',
        account_mapping: ''
      });
      setShowRuleForm(false);
      setEditingRule(null);
      fetchTransactionRules();
    } catch (err) {
      console.error('Error saving transaction rule:', err);
      onAlert?.('Failed to save transaction rule', 'error');
    }
  };

  // Handle rule editing
  const handleEditRule = (rule: TransactionRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      amount_min: rule.amount_min?.toString() || '',
      amount_max: rule.amount_max?.toString() || '',
      description_contains: rule.description_contains || '',
      bank_name: rule.bank_name || '',
      action: rule.action,
      account_mapping: rule.account_mapping || ''
    });
    setShowRuleForm(true);
  };

  // Handle rule deletion (soft delete)
  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase.rpc('soft_delete_transaction_rule', {
        p_rule_id: ruleId,
        p_user_id: user.id
      });
      
      if (error) throw error;
      
      if (data) {
        onAlert?.('Transaction rule deleted successfully', 'success');
        fetchTransactionRules();
      } else {
        onAlert?.('Rule not found or already deleted', 'warning');
      }
    } catch (err) {
      console.error('Error deleting transaction rule:', err);
      onAlert?.('Failed to delete transaction rule', 'error');
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([fetchConnectedBanks(), fetchTransactionRules()]);
      setLoading(false);
    };

    initializeData();

    // Listen for bank connection events
    const handleBankConnected = () => {
      fetchConnectedBanks();
    };

    window.addEventListener('bankConnected', handleBankConnected);
    return () => window.removeEventListener('bankConnected', handleBankConnected);
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 pr-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banking Setup</h1>
      </div>

      {/* Two Column Layout - Vertical Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Section 1: Bank Integration - Left Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-fit">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center justify-center gap-2">
                <Landmark className="w-5 h-5" />
                Bank Integration
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Connect your bank accounts securely using Plaid to automatically sync transactions.
              </p>
            </div>

            {/* Connect New Bank Button */}
            <div className="flex justify-center">
              <PlaidLinkButton onAlert={onAlert} />
            </div>

            {/* Connected Banks Section */}
            {connectedBanks.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Connected Banks</h3>
                <div className="space-y-4">
                  {connectedBanks.map((bank) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Landmark className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{bank.institution_name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Connected on {new Date(bank.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('connected_banks')
                                .delete()
                                .eq('id', bank.id);
                              
                              if (error) throw error;
                              
                              await fetchConnectedBanks();
                              onAlert?.('Bank account disconnected successfully', 'success');
                            } catch (err) {
                              console.error('Error disconnecting bank:', err);
                              onAlert?.('Failed to disconnect bank account', 'error');
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Disconnect Bank"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Transaction Rules - Right Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Transaction Rules
                </h2>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Create rules to automatically process incoming bank transactions.
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowRuleForm(true);
                  setEditingRule(null);
                  setRuleForm({
                    name: '',
                    amount_min: '',
                    amount_max: '',
                    description_contains: '',
                    bank_name: '',
                    action: 'reconcile',
                    account_mapping: ''
                  });
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>

            {/* Rules List */}
            {transactionRules.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-start gap-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Rules</h3>
                  <span className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                    {transactionRules.length} {transactionRules.length === 1 ? 'Rule' : 'Rules'}
                  </span>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactionRules.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="group flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200"
                    >
                      {/* Left side - Rule info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded text-white text-xs font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white text-left truncate">
                              {rule.name}
                            </h4>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                              rule.action === 'reconcile' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              rule.action === 'categorize' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              rule.action === 'flag' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {rule.action === 'reconcile' ? 'Reconcile' :
                               rule.action === 'categorize' ? 'Categorize' :
                               rule.action === 'flag' ? 'Flag' :
                               rule.action}
                            </span>
                          </div>
                          
                          {/* Rule Criteria - Compact 2-line layout with bullet points */}
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                            {/* Line 1: Amount and Description criteria */}
                            <div className="flex items-center gap-3 flex-wrap">
                              {rule.amount_min && (
                                <span className="flex items-center gap-1">
                                  <span>•</span>
                                  <span>Min: ${rule.amount_min.toLocaleString()}</span>
                                </span>
                              )}
                              {rule.amount_max && (
                                <span className="flex items-center gap-1">
                                  <span>•</span>
                                  <span>Max: ${rule.amount_max.toLocaleString()}</span>
                                </span>
                              )}
                              {rule.description_contains && (
                                <span className="flex items-center gap-1">
                                  <span>•</span>
                                  <span>Contains: "{rule.description_contains}"</span>
                                </span>
                              )}
                            </div>
                            
                            {/* Line 2: Bank and Account criteria */}
                            {(rule.bank_name || rule.account_mapping) && (
                              <div className="flex items-center gap-3 flex-wrap">
                                {rule.bank_name && (
                                  <span className="flex items-center gap-1">
                                    <span>•</span>
                                    <span>Bank: {rule.bank_name}</span>
                                  </span>
                                )}
                                {rule.account_mapping && (
                                  <span className="flex items-center gap-1">
                                    <span>•</span>
                                    <span>Account: {rule.account_mapping}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right side - Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all duration-200"
                          title="Edit Rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all duration-200"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rule Form - Full Width Modal */}
      {showRuleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingRule ? 'Edit Transaction Rule' : 'Create New Transaction Rule'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {editingRule ? 'Modify the rule criteria and actions' : 'Set up automated rules for incoming bank transactions'}
                  </p>
                </div>
                {editingRule && (
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-medium">Created:</span> {new Date(editingRule.created_at).toLocaleDateString()} {new Date(editingRule.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {editingRule.updated_at !== editingRule.created_at && (
                        <div>
                          <span className="font-medium">Updated:</span> {new Date(editingRule.updated_at).toLocaleDateString()} {new Date(editingRule.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <form onSubmit={handleRuleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter a descriptive name for this rule"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Action
                  </label>
                  <select
                    value={ruleForm.action}
                    onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    <option value="reconcile">Auto Reconcile</option>
                    <option value="categorize">Auto Categorize</option>
                    <option value="flag">Flag for Review</option>
                    <option value="ignore">Ignore Transaction</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Min Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={ruleForm.amount_min}
                      onChange={(e) => setRuleForm({ ...ruleForm, amount_min: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Max Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={ruleForm.amount_max}
                      onChange={(e) => setRuleForm({ ...ruleForm, amount_max: e.target.value })}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Description Contains
                  </label>
                  <input
                    type="text"
                    value={ruleForm.description_contains}
                    onChange={(e) => setRuleForm({ ...ruleForm, description_contains: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., PAYPAL, AMAZON, STARBUCKS"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={ruleForm.bank_name}
                    onChange={(e) => setRuleForm({ ...ruleForm, bank_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., Chase, Wells Fargo, Bank of America"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Account Mapping
                </label>
                <input
                  type="text"
                  value={ruleForm.account_mapping}
                  onChange={(e) => setRuleForm({ ...ruleForm, account_mapping: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Target account for reconciliation (optional)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Specify which account this rule should map transactions to
                </p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  onClick={() => {
                    setShowRuleForm(false);
                    setEditingRule(null);
                  }}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-sm transition-all duration-200 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingRule ? 'Update Rule' : 'Save Rule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankingSetup;