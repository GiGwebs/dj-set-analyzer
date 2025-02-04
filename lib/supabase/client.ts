"use client";

import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Database } from './database.types';

// Create a single supabase client for interacting with your database
export const supabase = createPagesBrowserClient<Database>({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options: {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
});