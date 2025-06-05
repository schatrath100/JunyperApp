import { createClient, type FetchOptions } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Custom fetch implementation with CORS mode
const customFetch = (url: string, options: FetchOptions = {}) => {
  return fetch(url, {
    ...options,
    mode: 'cors',
    credentials: 'include',
    headers: {
      ...options.headers,
    }
  });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storage: window.localStorage
  }
});

// Set up auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token');
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // Ensure we have the latest session
    if (session) {
      localStorage.setItem('supabase.auth.token', session.access_token);
    }
  }
});
