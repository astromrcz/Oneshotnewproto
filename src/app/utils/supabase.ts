/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://bqnswmjopwmvunzchqzl.supabase.co';

// Add VITE_SUPABASE_SERVICE_KEY right here at the top of the fallback list:
const supabaseKey = 
  import.meta.env.VITE_SUPABASE_SERVICE_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_KEY || 
  '';

if (!supabaseKey) {
  console.error('❌ [Supabase Client Error]: No public Supabase key found in import.meta.env. Make sure your variable in .env starts with VITE_');
}

export const supabase = createClient(supabaseUrl, supabaseKey);