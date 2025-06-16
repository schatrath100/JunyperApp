import React, { useState, useEffect } from 'react';
import { ChevronRight, Brain, Send, X, Loader2, Sparkles, Settings, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import RecentActivity from './RecentActivity';
import AISettings from './AISettings';
import { supabase } from '../lib/supabase';

interface SlideInPanelProps {
  className?: string;
}

interface AIResponse {
  message: string;
  timestamp: Date;
  type: 'user' | 'assistant';
}

const SlideInPanel: React.FC<SlideInPanelProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<AIResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAIConfig, setHasAIConfig] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(false);

  useEffect(() => {
    checkUserPermissions();
  }, []);

  const checkUserPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const adminStatus = profile?.role === 'admin';
      setIsAdmin(adminStatus);

      // Check if user has AI configuration
      const { data: aiConfig } = await supabase
        .from('ai_config')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      setHasAIConfig(!!aiConfig);
    } catch (error) {
      console.error('Error checking user permissions:', error);
    }
  };

  const handleAISubmit = async () => {
    if (!userQuestion.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message to conversation
    const userMessage: AIResponse = {
      message: userQuestion.trim(),
      timestamp: new Date(),
      type: 'user'
    };
    
    setConversation(prev => [...prev, userMessage]);
    const currentQuestion = userQuestion.trim();
    setUserQuestion('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user has AI configuration
      setCheckingConfig(true);
      const { data: aiConfig } = await supabase
        .from('ai_config')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!aiConfig) {
        throw new Error('AI configuration not found. Please contact your administrator to set up AI access.');
      }

      // Gather context for the AI
      const context = await gatherUserContext(user.id);

      // Call the Sydney AI function
      const response = await fetch('/.netlify/functions/sydney-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          question: currentQuestion,
          context: context,
          user_id: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      
      // Add AI response to conversation
      const aiMessage: AIResponse = {
        message: data.response,
        timestamp: new Date(),
        type: 'assistant'
      };
      
      setConversation(prev => [...prev, aiMessage]);

    } catch (error: any) {
      console.error('Error calling Sydney AI:', error);
      setError(error.message || 'Failed to get response from Sydney AI');
      
      // Add error message to conversation
      const errorMessage: AIResponse = {
        message: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
        type: 'assistant'
      };
      
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCheckingConfig(false);
    }
  };

  const gatherUserContext = async (userId: string) => {
    try {
      // Gather comprehensive user context
      const [accountsRes, transactionsRes, profileRes] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', userId).limit(10),
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(50),
        supabase.from('user_profiles').select('*').eq('id', userId).single()
      ]);

      const context = {
        user_profile: profileRes.data,
        accounts: accountsRes.data || [],
        recent_transactions: transactionsRes.data || [],
        account_summary: {
          total_accounts: accountsRes.data?.length || 0,
          total_balance: accountsRes.data?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0
        },
        transaction_summary: {
          recent_count: transactionsRes.data?.length || 0,
          recent_spending: transactionsRes.data?.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0,
          recent_income: transactionsRes.data?.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) || 0
        }
      };

      return context;
    } catch (error) {
      console.error('Error gathering context:', error);
      return {
        user_profile: null,
        accounts: [],
        recent_transactions: [],
        account_summary: { total_accounts: 0, total_balance: 0 },
        transaction_summary: { recent_count: 0, recent_spending: 0, recent_income: 0 }
      };
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAISubmit();
    }
  };

  const renderAIConfigStatus = () => {
    if (isAdmin) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center text-blue-800">
            <Settings className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Administrator Access</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            You can manage AI configurations for all users.
          </p>
          <button
            onClick={() => setShowAISettings(true)}
            className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
          >
            Manage AI Settings
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Slide-in Panel */}
      <div className={cn(
        "fixed right-0 top-0 h-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50",
        isOpen ? "translate-x-0" : "translate-x-full",
        "w-96",
        className
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Quick Actions</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {showAIChat ? (
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">Sydney AI</h3>
                      <p className="text-xs text-gray-500">Your Financial Assistant</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAIChat(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {renderAIConfigStatus()}

                {/* Conversation */}
                <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                  {conversation.length === 0 && (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        {hasAIConfig || isAdmin ? 
                          "Ask me anything about your finances!" : 
                          "AI access needs to be configured by an administrator"
                        }
                      </p>
                    </div>
                  )}
                  
                  {conversation.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg max-w-[85%]",
                        msg.type === 'user'
                          ? "bg-blue-500 text-white ml-auto"
                          : "bg-gray-100 text-gray-800"
                      )}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        msg.type === 'user' ? "text-blue-100" : "text-gray-500"
                      )}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">
                        {checkingConfig ? 'Checking configuration...' : 'Sydney is thinking...'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex space-x-2">
                    <textarea
                      value={userQuestion}
                      onChange={(e) => setUserQuestion(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={hasAIConfig || isAdmin ? "Ask Sydney about your finances..." : "AI access not configured - Please contact your administrator"}
                      disabled={!hasAIConfig && !isAdmin}
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      rows={2}
                    />
                    <button
                      onClick={handleAISubmit}
                      disabled={isLoading || !userQuestion.trim() || (!hasAIConfig && !isAdmin)}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  {error && (
                    <p className="text-xs text-red-500 mt-2">{error}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Sydney AI Section - 70% */}
                <div className="flex-[7] p-4 border-b border-gray-200">
                  <div className="w-full p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg text-white mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                        <Brain className="h-5 w-5 text-white" />
                        <Sparkles className="h-3 w-3 text-white/80 absolute animate-pulse" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Sydney AI</div>
                        <div className="text-xs opacity-90">Accounting AI Agent</div>
                      </div>
                    </div>
                  </div>

                  {renderAIConfigStatus()}

                  {/* AI Input Section */}
                  <div className="space-y-3">
                    <textarea
                      value={userQuestion}
                      onChange={(e) => setUserQuestion(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={hasAIConfig || isAdmin ? "Ask Sydney about your finances..." : "AI access not configured - Please contact your administrator"}
                      disabled={!hasAIConfig && !isAdmin}
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      rows={4}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleAISubmit}
                        disabled={isLoading || !userQuestion.trim() || (!hasAIConfig && !isAdmin)}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>Ask Sydney</span>
                          </>
                        )}
                      </button>
                    </div>
                    {error && (
                      <p className="text-xs text-red-500">{error}</p>
                    )}
                  </div>
                </div>

                {/* Recent Activity Section - 30% */}
                <div className="flex-[3] p-4 overflow-y-auto">
                  <RecentActivity compact={true} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Settings Modal */}
      {showAISettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AISettings onClose={() => setShowAISettings(false)} />
          </div>
        </div>
      )}

      {/* Toggle Tab */}
      <div
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed right-0 top-1/2 transform -translate-y-1/2 text-white shadow-lg transition-all duration-200 z-40 cursor-pointer",
          "rounded-l-lg w-8 py-28",
          "bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500",
          "animate-gradient-x bg-[length:200%_200%]",
          "hover:shadow-xl hover:scale-105",
          isOpen && "translate-x-full opacity-0"
        )}
        style={{
          background: 'linear-gradient(-45deg, #6366f1, #8b5cf6, #ec4899, #f97316, #06b6d4)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 4s ease infinite'
        }}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <Brain className="h-6 w-6 text-white/90 drop-shadow-sm" />
        </div>
      </div>
    </>
  );
};

export default SlideInPanel; 