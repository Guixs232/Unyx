
import { createClient } from '@supabase/supabase-js';

// Safe access to environment variables to prevent ReferenceError: process is not defined
const getEnv = (key: string, defaultValue: string) => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
    // @ts-ignore
    if (typeof window !== 'undefined' && window.process && window.process.env && window.process.env[key]) {
      // @ts-ignore
      return window.process.env[key];
    }
  } catch (e) {
    // Ignore errors in strict environments
  }
  return defaultValue;
};

const SUPABASE_URL = getEnv('REACT_APP_SUPABASE_URL', 'https://lnxallpwruwmlheleqoi.supabase.co');
const SUPABASE_ANON_KEY = getEnv('REACT_APP_SUPABASE_ANON_KEY', 'sb_publishable_9r0HtsqKPfXfuiXQJtZikQ_1bEPC1QO');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to check if configured
export const isSupabaseConfigured = () => {
    return SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' && 
           SUPABASE_URL !== '' &&
           !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
           SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY' &&
           SUPABASE_ANON_KEY !== '';
};
