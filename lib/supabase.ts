import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://svqdfbitilkfgcipdpdl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cWRmYml0aWxrZmdjaXBkcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MjAyMTIsImV4cCI6MjEwNDQ5NjIxMn0.TY6C05Y04UkhWFECr0iFE1QFoEtMjIGGsIilOVyLj8U';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cWRmYml0aWxrZmdjaXBkcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODkyMDIxMiwiZXhwIjoyMTA0NDk2MjEyfQ.ov_HbbOI1upIxNMEZnoDLrKm-wu1j3yHom4K8P5hPDo';

// Public Supabase client (Client & Server side singleton to avoid duplicate GoTrueClient instances)
function createBrowserSupabase() {
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  const globalWithSupabase = globalThis as typeof globalThis & {
    __supabaseClient?: ReturnType<typeof createClient>;
  };
  if (!globalWithSupabase.__supabaseClient) {
    globalWithSupabase.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return globalWithSupabase.__supabaseClient;
}

export const supabase = createBrowserSupabase();

// Admin Supabase client (Server side only — uses service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
