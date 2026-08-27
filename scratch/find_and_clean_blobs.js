const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amjenxlohtloytdjvird.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtamVueGxvaHRsb3l0ZGp2aXJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjgwMjg4OSwiZXhwIjoyMTAyMzc4ODg5fQ.KKgJN45aOw-Kn2c30sRYwJU9YYetBe85RP_IcT8paaA';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const tables = [
  'Banner',
  'Tournament',
  'Setting',
  'Announcement',
  'ShopProduct',
  'ShopBanner',
  'Notification',
  'RewardsHubSettings',
  'Champion',
  'User'
];

async function scanAndClean() {
  console.log('--- SCANNING SUPABASE TABLES FOR BLOB / GEMINI URLS ---');
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        // Table might not exist or error
        // console.log(`Table ${table}: ${error.message}`);
        continue;
      }
      if (!data || data.length === 0) continue;

      for (const row of data) {
        let hasBlob = false;
        const updates = {};
        for (const [col, val] of Object.entries(row)) {
          if (typeof val === 'string' && (val.includes('blob:') || val.includes('gemini.google.com'))) {
            console.log(`FOUND in table "${table}", id: "${row.id}", column: "${col}":\n  ${val.slice(0, 150)}...`);
            hasBlob = true;
            
            // Clean it: if it's purely a blob URL, replace with default or empty
            if (val.startsWith('blob:')) {
              if (col.toLowerCase().includes('banner') || col.toLowerCase().includes('image')) {
                updates[col] = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&h=1080&fit=crop&q=85';
              } else {
                updates[col] = '';
              }
            } else {
              // It's rich text containing an img tag with blob:
              // Replace any src="blob:..." with empty or safe placeholder
              const cleaned = val.replace(/src=["']blob:[^"']+["']/gi, 'src=""').replace(/blob:https:\/\/gemini\.google\.com\/[^\s"']+/gi, '');
              updates[col] = cleaned;
            }
          }
        }

        if (hasBlob) {
          console.log(`Cleaning row ${row.id} in ${table}...`);
          const { error: updateErr } = await supabase.from(table).update(updates).eq('id', row.id);
          if (updateErr) {
            console.error(`Failed to update ${table} row ${row.id}:`, updateErr);
          } else {
            console.log(`Successfully cleaned ${table} row ${row.id}!`);
          }
        }
      }
    } catch (err) {
      console.error(`Error processing table ${table}:`, err);
    }
  }
  console.log('--- SCAN AND CLEAN FINISHED ---');
}

scanAndClean();
