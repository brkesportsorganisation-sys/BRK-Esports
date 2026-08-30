import { getWhatsAppTargetGroups, getWhatsAppSchedules, getWhatsAppSettings } from '../lib/whatsapp';

async function checkDb() {
  const settings = await getWhatsAppSettings();
  console.log('--- Current WhatsApp Settings ---');
  console.log(JSON.stringify(settings, null, 2));

  const groups = await getWhatsAppTargetGroups();
  console.log('\n--- Current Target Groups in DB ---');
  console.log(JSON.stringify(groups, null, 2));

  const schedules = await getWhatsAppSchedules();
  console.log('\n--- Current Schedules in DB ---');
  console.log(JSON.stringify(schedules, null, 2));
}

checkDb().catch(console.error);
