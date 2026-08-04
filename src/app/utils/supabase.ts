/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// 1. Check common Supabase URL names
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://bqnswmjopwmvunzchqzl.supabase.co';

// 2. Check multiple common Vite Supabase Key names
const supabaseKey = 
  import.meta.env.VITE_SUPABASE_SERVICE_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_KEY || 
  '';

// 3. Warn clearly in the browser console if the key is missing
if (!supabaseKey) {
  console.error('❌ [Supabase Client Error]: No public Supabase key found in import.meta.env. Make sure your variable in .env starts with VITE_');
}

export const supabase = createClient(supabaseUrl, supabaseKey);