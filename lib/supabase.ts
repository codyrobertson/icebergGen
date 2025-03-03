import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

// Validate Supabase URL format
const isValidSupabaseUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Create a browser client for client components
export const createBrowserSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey || !isValidSupabaseUrl(supabaseUrl)) {
    throw new Error('Invalid or missing Supabase configuration');
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// Create a single instance of the Supabase client to be used across the app
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey || !isValidSupabaseUrl(supabaseUrl)) {
    throw new Error('Invalid or missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
})();

// Server-side client for server components
export const createServerSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || !isValidSupabaseUrl(url)) {
    throw new Error('Invalid or missing Supabase configuration');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}; 