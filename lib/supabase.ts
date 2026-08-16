import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://amjenxlohtloytdjvird.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtamVueGxvaHRsb3l0ZGp2aXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MDI4ODksImV4cCI6MjEwMjM3ODg4OX0._MET-w_TBV0NAYSpWFcyDAyTXKZPobZh5auytfD0XMo';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtamVueGxvaHRsb3l0ZGp2aXJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjg4OSwiZXhwIjoyMTAyMzc4ODg5fQ.KKgJN45aOw-Kn2c30sRYwJU9YYetBe85RP_IcT8paaA';

// Public Supabase client (Client & Server side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin Supabase client (Server side only — uses service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
