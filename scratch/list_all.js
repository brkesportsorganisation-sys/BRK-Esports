const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amjenxlohtloytdjvird.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtamVueGxvaHRsb3l0ZGp2aXJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjg4OSwiZXhwIjoyMTAyMzc4ODg5fQ.KKgJN45aOw-Kn2c30sRYwJU9YYetBe85RP_IcT8paaA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function listAllTables() {
  const commonNames = [
    'Banner', 'banners', 'tournament', 'Tournament', 'setting', 'Setting', 'settings',
    'announcement', 'Announcement', 'shop_product', 'ShopProduct', 'shop_banner', 'ShopBanner',
    'notification', 'Notification', 'user', 'User', 'participant', 'Participant',
    'post', 'Post', 'comment', 'Comment', 'champion', 'Champion', 'team', 'Team',
    'app_settings', 'system_settings', 'site_settings'
  ];

  for (const name of commonNames) {
    const { data, error } = await supabase.from(name).select('*').limit(20);
    if (!error && data) {
      console.log(`Table exists: ${name} (count: ${data.length})`);
      for (const row of data) {
        for (const [k, v] of Object.entries(row)) {
          const str = JSON.stringify(v);
          if (str && (str.includes('blob:') || str.includes('gemini.google'))) {
            console.log(`🔥 MATCH IN TABLE "${name}", column "${k}":`, str);
          }
        }
      }
    }
  }
}

listAllTables();
