const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function test() {
  const { data, error } = await supabase
    .from('User')
    .select('*')
    .eq('id', 'usr_1788586131546_a4leg')
    .maybeSingle();

  console.log('Query result with select(*):', {
    hasData: !!data,
    userId: data?.id,
    userName: data?.name,
    error: error?.message
  });
}

test();
