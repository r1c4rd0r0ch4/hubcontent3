import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

console.log('[supabase.ts] VITE_SUPABASE_URL:', supabaseUrl ? `Loaded (length: ${supabaseUrl.length})` : 'Missing');
console.log('[supabase.ts] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `Loaded (length: ${supabaseAnonKey.length})` : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase.ts] CRITICAL ERROR: Missing Supabase environment variables.');
  throw new Error('Missing Supabase environment variables');
}

let client;
try {
  client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  console.log('[supabase.ts] Supabase client created successfully.');
} catch (error) {
  console.error('[supabase.ts] CRITICAL ERROR: Failed to create Supabase client.', error);
  throw error; // Re-throw to ensure the application stops
}

export const supabase = client;
