import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Use valid fallback values for development if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your-supabase-url-here' 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL 
  : 'https://demo.supabase.co';

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-supabase-anon-key-here'
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  : 'demo-anon-key';

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL: ${supabaseUrl}. Please check your NEXT_PUBLIC_SUPABASE_URL environment variable.`);
}

// Warn if using demo values
if (supabaseUrl === 'https://demo.supabase.co') {
  console.warn('⚠️ Using demo Supabase values. Please set up your real Supabase environment variables.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export default supabase;