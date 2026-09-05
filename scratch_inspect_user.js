const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function inspectUserColumns() {
  const { data, error } = await supabase
    .from('User')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching User:', error);
  } else if (data && data.length > 0) {
    console.log('User table columns:', Object.keys(data[0]));
    console.log('Sample User:', data[0]);
  } else {
    console.log('No users found in User table');
  }
}

inspectUserColumns();
