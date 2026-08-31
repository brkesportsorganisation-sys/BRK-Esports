const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAppIds() {
  console.log("Checking SiteSettings cache for BRK- account numbers...");
  
  const { data: setting, error } = await supabase
    .from('SiteSetting')
    .select('*')
    .eq('key', 'BRK_ESPORTS_SQUADS')
    .maybeSingle();

  if (error) {
    console.error("Error fetching squads from SiteSettings:", error);
    return;
  }

  if (setting && setting.value) {
    let squads = [];
    try {
      squads = JSON.parse(setting.value);
    } catch (e) {
      console.error("Failed to parse squad JSON.");
      return;
    }
    
    let updatedCount = 0;
    
    for (const squad of squads) {
      if (squad.members && Array.isArray(squad.members)) {
        for (const m of squad.members) {
          if (m.accountNumber && m.accountNumber.startsWith('BRK-')) {
            const newAcc = m.accountNumber.replace('BRK-', 'EZBD-');
            console.log(`Updating squad member ${m.userName} in squad ${squad.name}: ${m.accountNumber} -> ${newAcc}`);
            m.accountNumber = newAcc;
            updatedCount++;
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      const { error: updateError } = await supabase
        .from('SiteSetting')
        .update({ value: JSON.stringify(squads) })
        .eq('key', 'BRK_ESPORTS_SQUADS');
        
      if (updateError) {
        console.error("Error saving updated SiteSettings:", updateError);
      } else {
        console.log(`Updated ${updatedCount} account numbers in SiteSettings cache.`);
      }
    } else {
      console.log("No BRK- account numbers found in SiteSettings cache.");
    }
  }
}

fixAppIds();
