import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'implicit',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    // Additional security settings
    storageKey: 'junyper-auth-token',
    debug: false
  }
});

// Set up auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('junyper-auth-token');
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // Ensure we have the latest session
    if (session) {
      localStorage.setItem('supabase.auth.token', session.access_token);
    }
  }
});
