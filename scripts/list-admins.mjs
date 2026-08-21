import { supabaseAdmin } from './lib/supabase.js';

async function listAdmins() {
  try {
    const { data, error } = await supabaseAdmin.from('AdminAccount').select('id, username, email, displayName, role, isActive, createdAt');
    console.log('Supabase Admin Accounts:', data || []);
    if (error) console.log('Error querying AdminAccount:', error.message);
  } catch (e) {
    console.error(e);
  }
}

listAdmins();
