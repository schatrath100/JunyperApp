import React, { useState, useEffect } from 'react';
import { Brain, Save, Eye, EyeOff, Key, Settings, AlertCircle, CheckCircle, Shield, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface AIConfig {
  id?: string;
  user_id?: string;
  api_key: string;
  model_provider: 'openai' | 'anthropic';
  model_name: string;
  max_tokens: number;
  temperature: number;
  user_profiles?: {
    email: string;
    full_name?: string;
  };
}

interface AISettingsProps {
  onClose?: () => void;
  className?: string;
}

interface UserProfile {
  role: string;
}

const AISettings: React.FC<AISettingsProps> = ({ onClose, className }) => {
  const [config, setConfig] = useState<AIConfig>({
    api_key: '',
    model_provider: 'openai',
    model_name: 'gpt-4o-mini',
    max_tokens: 1000,
    temperature: 0.7
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [allConfigs, setAllConfigs] = useState<AIConfig[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<{ id: string; email: string; full_name?: string }[]>([]);

  useEffect(() => {
    checkAdminPermissions();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllConfigs();
    }
  }, [isAdmin]);

  const checkAdminPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin permissions:', error);
    } finally {
      setCheckingPermissions(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .order('email');

      setUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAllConfigs = async () => {
    try {
      const { data: configs } = await supabase
        .from('ai_config')
        .select(`
          *,
          user_profiles(email, full_name)
        `)
        .order('created_at', { ascending: false });

      setAllConfigs(configs || []);
    } catch (error) {
      console.error('Error fetching AI configs:', error);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      setMessage({ type: 'error', text: 'Only administrators can manage AI configurations' });
      return;
    }

    if (!selectedUserId) {
      setMessage({ type: 'error', text: 'Please select a user' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const configData = {
        user_id: selectedUserId,
        api_key: config.api_key,
        model_provider: config.model_provider,
        model_name: config.model_name,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        is_active: true
      };

      // Check if config exists for this user
      const { data: existingConfig } = await supabase
        .from('ai_config')
        .select('id')
        .eq('user_id', selectedUserId)
        .single();

      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from('ai_config')
          .update(configData)
          .eq('id', existingConfig.id);

        if (error) throw error;
        setMessage({ type: 'success', text: 'AI configuration updated successfully!' });
      } else {
        // Insert new config
        const { error } = await supabase
          .from('ai_config')
          .insert([configData]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'AI configuration created successfully!' });
      }

      // Refresh configs list
      await fetchAllConfigs();
      
      // Reset form
      setConfig({
        api_key: '',
        model_provider: 'openai',
        model_name: 'gpt-4o-mini',
        max_tokens: 1000,
        temperature: 0.7
      });
      setSelectedUserId('');

    } catch (error: any) {
      console.error('Error saving AI config:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save AI configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('ai_config')
        .delete()
        .eq('id', configId);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'AI configuration deleted successfully!' });
      await fetchAllConfigs();
    } catch (error: any) {
      console.error('Error deleting AI config:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete AI configuration' });
    }
  };

  const loadConfigForEdit = (configData: AIConfig) => {
    setConfig({
      api_key: configData.api_key,
      model_provider: configData.model_provider,
      model_name: configData.model_name,
      max_tokens: configData.max_tokens,
      temperature: configData.temperature
    });
    setSelectedUserId(configData.user_id || '');
  };

  if (checkingPermissions) {
    return (
      <div className={cn("bg-white rounded-lg shadow-lg p-6", className)}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Checking permissions...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={cn("bg-white rounded-lg shadow-lg p-6", className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-red-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">AI Settings</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          )}
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Administrator Access Required</h3>
          <p className="text-gray-500 max-w-md">
            AI configuration management is restricted to administrators only. 
            Please contact your system administrator to configure API keys and AI settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-lg p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Brain className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">AI Configuration (Admin)</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        )}
      </div>

      {message && (
        <div className={cn(
          "p-3 rounded-md mb-4 flex items-center",
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        )}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 mr-2" />
          ) : (
            <AlertCircle className="h-4 w-4 mr-2" />
          )}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* User Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select User
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a user...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>
        </div>

        {/* API Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Provider
          </label>
          <select
            value={config.model_provider}
            onChange={(e) => setConfig({ ...config, model_provider: e.target.value as 'openai' | 'anthropic' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <select
            value={config.model_name}
            onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {config.model_provider === 'openai' ? (
              <>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </>
            ) : (
              <>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
              </>
            )}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Key className="inline h-4 w-4 mr-1" />
            API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder="Enter API key..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens
            </label>
            <input
              type="number"
              value={config.max_tokens}
              onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
              min="100"
              max="4000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature
            </label>
            <input
              type="number"
              value={config.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              min="0"
              max="1"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading || !config.api_key || !selectedUserId}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </button>

        {/* Existing Configurations */}
        {allConfigs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Existing Configurations</h3>
            <div className="space-y-3">
              {allConfigs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {config.user_profiles?.full_name || config.user_profiles?.email}
                    </div>
                    <div className="text-sm text-gray-600">
                      {config.model_provider} - {config.model_name}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => loadConfigForEdit(config)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(config.id!)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISettings; 