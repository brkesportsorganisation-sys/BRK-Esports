import Zavudev from '@zavudev/sdk';
import { supabaseAdmin } from './supabase';
import { WhatsAppSchedule, WhatsAppTargetGroup, WhatsAppMessageLog, WhatsAppFrequency } from './types';

/**
 * Normalizes phone numbers to standard E.164 format.
 * Examples:
 *   "01712345678"     -> "+8801712345678"
 *   "8801712345678"   -> "+8801712345678"
 *   "+8801712345678"  -> "+8801712345678"
 *   "+1 (555) 0123"   -> "+15550123"
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  // Preserve WhatsApp Group JIDs (e.g. 120363028392819283@g.us, @broadcast)
  if (trimmed.includes('@g.us') || trimmed.includes('@broadcast') || trimmed.includes('@s.whatsapp.net')) {
    return trimmed;
  }
  // Preserve WhatsApp Group & Channel Links
  if (trimmed.includes('chat.whatsapp.com/') || trimmed.includes('whatsapp.com/channel/')) {
    return trimmed;
  }
  // Remove spaces, hyphens, parentheses, and other non-digit chars (except leading +)
  let cleaned = trimmed.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Bangladesh numbers starting with '01'
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `+88${cleaned}`;
  }

  // Bangladesh numbers starting with '8801'
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // If starts with 0, strip and assume BD or international
  if (cleaned.startsWith('0')) {
    return `+88${cleaned}`;
  }

  // Default prefix +
  return `+${cleaned}`;
}

export interface WhatsAppSettings {
  apiKey: string;
  isEnabled: boolean;
  defaultTemplate: string;
}

/**
 * Fetches WhatsApp / Zavu settings from database or environment variables.
 */
export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  let dbApiKey = '';
  let isEnabled = true;
  let defaultTemplate = `🎮 {TOURNAMENT_NAME} 🎮\n\nআপনার ম্যাচের রুম ডিটেইলস:\n🔹 Room ID: {ROOM_ID}\n🔹 Password: {ROOM_PASS}\n\nদ্রুত গেমে জয়েন করুন!`;

  try {
    const { data: settings } = await supabaseAdmin
      .from('SiteSetting')
      .select('key, value');

    const map = (settings || []).reduce((acc: Record<string, string>, item: any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    if (map.ZAVU_API_KEY) dbApiKey = map.ZAVU_API_KEY;
    if (map.WHATSAPP_API_KEY && !dbApiKey) dbApiKey = map.WHATSAPP_API_KEY;
    if (map.WHATSAPP_ENABLED !== undefined) isEnabled = map.WHATSAPP_ENABLED === 'true';
    if (map.WHATSAPP_ROOM_TEMPLATE) defaultTemplate = map.WHATSAPP_ROOM_TEMPLATE;
  } catch (err) {
    console.warn('[WhatsApp] Could not fetch settings from database:', err);
  }

  const apiKey = dbApiKey || process.env.ZAVU_API_KEY || process.env.ZAVUDEV_API_KEY || '';

  return {
    apiKey,
    isEnabled,
    defaultTemplate,
  };
}

/**
 * Initializes the Zavudev client instance.
 */
export async function getZavuClient(): Promise<{ client: Zavudev | null; error?: string }> {
  const settings = await getWhatsAppSettings();

  if (!settings.apiKey) {
    return {
      client: null,
      error: 'Zavu API key is missing. Please set ZAVU_API_KEY in environment variables or Admin Settings.',
    };
  }

  try {
    const client = new Zavudev({ apiKey: settings.apiKey });
    return { client };
  } catch (err: any) {
    return {
      client: null,
      error: err?.message || 'Failed to initialize Zavu WhatsApp client.',
    };
  }
}

/**
 * Helper to get the default sender ID for the Zavu SDK.
 * Prioritizes Bangladesh (+880) numbers over US/other demo numbers.
 * NOTE: The Zavu SDK's send() method expects 'Zavu-Sender' inside the PARAMS
 * object (1st arg), NOT in options.headers (2nd arg).
 */
export async function getDefaultSenderId(client: Zavudev): Promise<string | undefined> {
  try {
    const senders: any[] = [];
    const seenIds = new Set<string>();
    for await (const s of client.senders.list()) {
      const phoneNumId = (s as any).whatsapp?.phoneNumberId || s.id;
      if (seenIds.has(phoneNumId)) continue;
      seenIds.add(phoneNumId);
      senders.push(s);
    }
    if (senders.length > 0) {
      // Prioritize Bangladesh numbers or verified numbers matching +880
      const bdSender = senders.find((s: any) => 
        (s.phoneNumber && s.phoneNumber.includes('880')) ||
        (s.whatsapp?.displayPhoneNumber && s.whatsapp.displayPhoneNumber.includes('880'))
      );
      if (bdSender?.id) {
        return bdSender.id;
      }
      const defaultSender = senders.find((s: any) => s.isDefault) || senders[0];
      if (defaultSender?.id) {
        return defaultSender.id;
      }
    }
  } catch (err: any) {
    console.warn('[Zavu Sender ID Check]', err?.message);
  }
  return undefined;
}

export interface SendRoomDetailsParams {
  playerPhone: string;
  roomId: string;
  pass: string;
  playerName?: string;
  tournamentTitle?: string;
  customMessage?: string;
}

/**
 * Sends Match Room ID and Password to a player via WhatsApp.
 */
export async function sendRoomDetailsToPlayer({
  playerPhone,
  roomId,
  pass,
  playerName = 'Player',
  tournamentTitle = 'BRK ESPORTS TOURNAMENT',
  customMessage,
}: SendRoomDetailsParams) {
  const formattedPhone = normalizePhoneNumber(playerPhone);

  if (!formattedPhone || formattedPhone.length < 10) {
    return {
      success: false,
      message: `Invalid phone number format: "${playerPhone}". Please provide a valid phone number with country code (e.g. +88017XXXXXXXX).`,
    };
  }

  if (!roomId || !pass) {
    return {
      success: false,
      message: 'Room ID and Password are required.',
    };
  }

  const settings = await getWhatsAppSettings();
  if (!settings.isEnabled) {
    return {
      success: false,
      message: 'WhatsApp notifications are currently disabled in Admin Settings.',
    };
  }

  const { client, error } = await getZavuClient();
  if (!client) {
    return { success: false, message: error || 'Zavu client initialization failed.' };
  }

  // Construct message text
  let text = customMessage;
  if (!text) {
    text = settings.defaultTemplate
      .replace(/\{TOURNAMENT_NAME\}/g, tournamentTitle)
      .replace(/\{ROOM_ID\}/g, roomId)
      .replace(/\{ROOM_PASS\}/g, pass)
      .replace(/\{PLAYER_NAME\}/g, playerName);
  }

  try {
    const senderId = await getDefaultSenderId(client);
    const response = await client.messages.send({
      channel: 'whatsapp',
      to: formattedPhone,
      text,
      ...(senderId ? { 'Zavu-Sender': senderId } : {}),
    });

    await addWhatsAppLog({
      targetDestination: formattedPhone,
      targetName: playerName,
      messageText: text,
      triggerType: 'ROOM_ALERT',
      status: 'SENT',
      responseId: (response as any)?.message?.id || (response as any)?.id || (response as any)?.messageId || 'queued',
    });

    return {
      success: true,
      message: `WhatsApp message successfully sent to ${formattedPhone}!`,
      response,
    };
  } catch (err: any) {
    console.error('[WhatsApp Send Error]', err);
    const rawMsg = err?.message || '';
    let errMsg = rawMsg;
    if (rawMsg.includes('No default sender') || rawMsg.includes('Zavu-Sender')) {
      errMsg = '⚠️ আপনার Zavu অ্যাকাউন্টে কোনো WhatsApp Sender / Phone Number এখনও যুক্ত করা হয়নি। অনুগ্রহ করে Zavu ড্যাশবোর্ডে গিয়ে একটি Sender (WhatsApp QR বা Cloud API) কানেক্ট করুন।';
    } else if (rawMsg.includes('24') || rawMsg.includes('Re-engagement') || rawMsg.includes('outside the allowed window') || rawMsg.includes('session')) {
      errMsg = `⚠️ Meta WhatsApp 24-ঘণ্টা নীতি: এই নম্বর (${formattedPhone}) আপনার WhatsApp নম্বরে (+880 1846-587311) প্রথমে একটি মেসেজ না পাঠালে আপনি Free-form message পাঠাতে পারবেন না। প্লেয়ারকে আগে আপনাকে message করতে বলুন অথবা Approved Template ব্যবহার করুন।`;
    }

    await addWhatsAppLog({
      targetDestination: formattedPhone,
      targetName: playerName,
      messageText: text,
      triggerType: 'ROOM_ALERT',
      status: 'FAILED',
      error: errMsg,
    });

    return {
      success: false,
      message: errMsg,
      error: err,
    };
  }
}

/**
 * Sends a generic direct message to a destination phone or group via WhatsApp.
 */
export async function sendDirectWhatsappMessage({
  to,
  text,
  targetName = 'Contact',
  triggerType = 'INSTANT_BROADCAST',
}: {
  to: string;
  text: string;
  targetName?: string;
  triggerType?: 'SCHEDULED_AUTOMATION' | 'INSTANT_BROADCAST' | 'ROOM_ALERT' | 'TEST';
}) {
  const formattedTo = normalizePhoneNumber(to);
  if (!formattedTo || formattedTo.length < 9) {
    return { success: false, message: `Invalid phone format: ${to}` };
  }

  const { client, error } = await getZavuClient();
  if (!client) {
    return { success: false, message: error || 'Zavu client initialization failed.' };
  }

  try {
    const senderId = await getDefaultSenderId(client);
    const response = await client.messages.send({
      channel: 'whatsapp',
      to: formattedTo,
      text,
      ...(senderId ? { 'Zavu-Sender': senderId } : {}),
    });

    await addWhatsAppLog({
      targetDestination: formattedTo,
      targetName,
      messageText: text,
      triggerType,
      status: 'SENT',
      responseId: (response as any)?.message?.id || (response as any)?.id || (response as any)?.messageId || 'queued',
    });

    return { success: true, message: `Delivered to ${formattedTo}`, response };
  } catch (err: any) {
    const rawMsg = err?.message || '';
    let errMsg = rawMsg;
    if (rawMsg.includes('No default sender') || rawMsg.includes('Zavu-Sender')) {
      errMsg = '⚠️ আপনার Zavu অ্যাকাউন্টে কোনো WhatsApp Sender / Phone Number এখনও যুক্ত করা হয়নি। অনুগ্রহ করে Zavu ড্যাশবোর্ডে গিয়ে একটি Sender কানেক্ট করুন।';
    } else if (rawMsg.includes('24') || rawMsg.includes('Re-engagement') || rawMsg.includes('outside the allowed window') || rawMsg.includes('session')) {
      errMsg = `⚠️ Meta WhatsApp 24-ঘণ্টা নীতি: এই নম্বরে (${formattedTo}) Free-form message পাঠাতে হলে প্লেয়ারকে আগে আপনার নম্বরে (+880 1846-587311) একটি মেসেজ দিয়ে 24 ঘণ্টার উইন্ডো খুলতে হবে।`;
    }

    await addWhatsAppLog({
      targetDestination: formattedTo,
      targetName,
      messageText: text,
      triggerType,
      status: 'FAILED',
      error: errMsg,
    });

    return { success: false, message: errMsg, error: err };
  }
}


/**
 * Broadcasts Room ID and Password to multiple players / squad captains.
 */
export async function broadcastRoomDetails({
  recipients,
  roomId,
  pass,
  tournamentTitle = 'BRK ESPORTS TOURNAMENT',
  customMessage,
}: {
  recipients: Array<{ phone: string; name?: string }>;
  roomId: string;
  pass: string;
  tournamentTitle?: string;
  customMessage?: string;
}) {
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const recipient of recipients) {
    const res = await sendRoomDetailsToPlayer({
      playerPhone: recipient.phone,
      playerName: recipient.name || 'Captain',
      roomId,
      pass,
      tournamentTitle,
      customMessage,
    });

    if (res.success) {
      successCount++;
    } else {
      failCount++;
    }

    results.push({
      phone: recipient.phone,
      name: recipient.name,
      ...res,
    });
  }

  return {
    success: successCount > 0,
    total: recipients.length,
    successCount,
    failCount,
    results,
  };
}

// ==========================================
// 🤖 WHATSAPP AUTOMATION SCHEDULER & STORE
// ==========================================

const DEFAULT_GROUPS: WhatsAppTargetGroup[] = [
  {
    id: 'grp_tournament_main',
    name: 'Main Tournament WhatsApp Group 🎮',
    category: 'TOURNAMENT_MAIN',
    identifier: 'https://chat.whatsapp.com/sample-main-group',
    description: 'Official tournament participant discussion and room link group.',
    memberCount: 250,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp_scrims_vip',
    name: 'VIP Tier-1 Scrims Community ⚔️',
    category: 'SCRIMS_VIP',
    identifier: 'https://chat.whatsapp.com/sample-scrims-vip',
    description: 'Daily competitive scrims and slot confirmation group.',
    memberCount: 120,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp_registered_captains',
    name: 'All Registered Squad Captains (Dynamic 👥)',
    category: 'REGISTRATION_GROUP',
    identifier: 'TOURNAMENT_CAPTAINS',
    description: 'Dynamic recipient group targeting all verified team captains from active tournaments.',
    memberCount: 48,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SCHEDULES: WhatsAppSchedule[] = [
  {
    id: 'sched_room_reminder_9pm',
    title: 'Daily 9:00 PM Tournament Room ID Auto-Alert',
    description: 'Sends room ID and password reminder alert 15 minutes before the 9:00 PM prime squad match.',
    targetType: 'TOURNAMENT_CAPTAINS',
    targetDestination: 'ACTIVE_TOURNAMENTS',
    targetName: 'All Active Squad Captains',
    messageType: 'ROOM_ALERT',
    messageTemplate: `🎮 BRK ESPORTS ROOM ID ALERT 🎮\n\nম্যাচের রুম আইডি ও পাসওয়ার্ড রিলিজ করা হয়েছে!\n🔹 Tournament: {TOURNAMENT_NAME}\n🔹 Room ID: {ROOM_ID}\n🔹 Password: {ROOM_PASS}\n\nসঠিক স্লটে জয়েন করুন এবং Booyah ছিনিয়ে নিন! 🔥`,
    frequency: 'DAILY',
    scheduledTime: '20:45',
    activeDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    isActive: true,
    status: 'ACTIVE',
    runCount: 14,
    lastRunAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    nextRunAt: new Date(Date.now() + 3600000 * 4).toISOString(),
    lastStatus: 'SUCCESS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sched_daily_reg_promo',
    title: 'Slot Registration Reminder & Prize Boost (Every 2 Hours)',
    description: 'Recurring notification to group members about available tournament slots and entry fees.',
    targetType: 'GROUP',
    targetDestination: '+8801712345678',
    targetName: 'Main Tournament Community',
    messageType: 'REGISTRATION_REMINDER',
    messageTemplate: `🔥 BRK ESPORTS TOURNAMENT SLOTS OPEN 🔥\n\nআজকের গ্র্যান্ড ফ্রি ফায়ার টুর্নামেন্টের স্লট বুকিং চলছে!\n🏆 Prize Pool: ৳4,000 CASH\n🎟️ Entry Fee: ৳100 (অথবা 1,000 Coins)\n\nদ্রুত আপনার স্কোয়াড রেজিস্টার করুন: https://brkesports.com/tournaments`,
    frequency: 'EVERY_2_HOURS',
    intervalMinutes: 120,
    activeStartTime: '10:00',
    activeEndTime: '23:00',
    activeDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    isActive: true,
    status: 'ACTIVE',
    runCount: 38,
    lastRunAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    nextRunAt: new Date(Date.now() + 3600000 * 2).toISOString(),
    lastStatus: 'SUCCESS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Loads all WhatsApp scheduled jobs from SiteSetting store.
 */
export async function getWhatsAppSchedules(): Promise<WhatsAppSchedule[]> {
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_AUTOMATION_SCHEDULES')
      .maybeSingle();

    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[getWhatsAppSchedules] could not load from SiteSetting:', err);
  }

  return DEFAULT_SCHEDULES;
}

/**
 * Saves all WhatsApp scheduled jobs to SiteSetting store.
 */
export async function saveWhatsAppSchedules(schedules: WhatsAppSchedule[]): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_WHATSAPP_AUTOMATION_SCHEDULES',
        key: 'WHATSAPP_AUTOMATION_SCHEDULES',
        value: JSON.stringify(schedules),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    return !error;
  } catch (err) {
    console.error('[saveWhatsAppSchedules] error:', err);
    return false;
  }
}

/**
 * Loads all WhatsApp Target Groups from SiteSetting store.
 */
export async function getWhatsAppTargetGroups(): Promise<WhatsAppTargetGroup[]> {
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_TARGET_GROUPS')
      .maybeSingle();

    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[getWhatsAppTargetGroups] error:', err);
  }

  return DEFAULT_GROUPS;
}

/**
 * Saves WhatsApp Target Groups to SiteSetting store.
 */
export async function saveWhatsAppTargetGroups(groups: WhatsAppTargetGroup[]): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_WHATSAPP_TARGET_GROUPS',
        key: 'WHATSAPP_TARGET_GROUPS',
        value: JSON.stringify(groups),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    return !error;
  } catch (err) {
    console.error('[saveWhatsAppTargetGroups] error:', err);
    return false;
  }
}

/**
 * Loads recent WhatsApp message logs from SiteSetting store.
 */
export async function getWhatsAppLogs(): Promise<WhatsAppMessageLog[]> {
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_MESSAGE_LOGS')
      .maybeSingle();

    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 100); // return up to 100 most recent logs
      }
    }
  } catch (err) {
    console.warn('[getWhatsAppLogs] error:', err);
  }

  return [];
}

/**
 * Records a new WhatsApp message log.
 */
export async function addWhatsAppLog(log: Omit<WhatsAppMessageLog, 'id' | 'sentAt'>): Promise<void> {
  try {
    const existing = await getWhatsAppLogs();
    const newLog: WhatsAppMessageLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sentAt: new Date().toISOString(),
      ...log,
    };

    const updated = [newLog, ...existing].slice(0, 100);

    await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_WHATSAPP_MESSAGE_LOGS',
        key: 'WHATSAPP_MESSAGE_LOGS',
        value: JSON.stringify(updated),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });
  } catch (err) {
    console.warn('[addWhatsAppLog] failed to write log:', err);
  }
}

/**
 * Sends a message directly to a WhatsApp group via JID or saved group identifier.
 */
export async function sendGroupWhatsappMessage({
  groupDestination,
  text,
  targetName = 'WhatsApp Group',
}: {
  groupDestination: string;
  text: string;
  targetName?: string;
}) {
  return sendDirectWhatsappMessage({
    to: groupDestination,
    text,
    targetName,
    triggerType: 'INSTANT_BROADCAST',
  });
}

/**
 * Calculates next run timestamp based on schedule interval and time preferences.
 */
export function calculateNextRunTime(schedule: WhatsAppSchedule): string {
  const now = new Date();

  if (schedule.frequency === 'ONCE') {
    if (schedule.scheduledDate) {
      return new Date(schedule.scheduledDate).toISOString();
    }
    return new Date(now.getTime() + 60000).toISOString();
  }

  if (schedule.frequency === 'EVERY_5_MIN') {
    return new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  }

  if (schedule.frequency === 'EVERY_10_MIN') {
    return new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  }

  if (schedule.frequency === 'EVERY_15_MIN') {
    return new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  }

  if (schedule.frequency === 'EVERY_30_MIN') {
    return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  }

  if (schedule.frequency === 'EVERY_1_HOUR') {
    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }

  if (schedule.frequency === 'EVERY_2_HOURS') {
    return new Date(now.getTime() + 120 * 60 * 1000).toISOString();
  }

  if (schedule.frequency === 'EVERY_6_HOURS') {
    return new Date(now.getTime() + 360 * 60 * 1000).toISOString();
  }

  if (schedule.frequency === 'EVERY_12_HOURS') {
    return new Date(now.getTime() + 720 * 60 * 1000).toISOString();
  }

  if (schedule.frequency === 'INTERVAL_MINUTES') {
    const mins = Math.max(1, schedule.intervalMinutes || 60);
    return new Date(now.getTime() + mins * 60 * 1000).toISOString();
  }

  if (schedule.frequency === 'DAILY') {
    const [hours, minutes] = (schedule.scheduledTime || '20:00').split(':').map(Number);
    const target = new Date();
    target.setHours(hours || 20, minutes || 0, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.toISOString();
  }

  return new Date(now.getTime() + 3600000).toISOString();
}

/**
 * Executes an individual WhatsApp schedule job immediately.
 * Supports:
 * - Specific message sequences or rotating messages (messagesSequence)
 * - Dynamic placeholders: {COUNT}, {MAX_COUNT}, {REMAINING}, {TIME}, {DATE}, {SITE_LINK}
 * - Execution count limit (maxExecutions) with automatic completion
 */
export async function executeScheduledJob(schedule: WhatsAppSchedule): Promise<{
  success: boolean;
  message: string;
  sentCount: number;
}> {
  if (!schedule.isActive || schedule.status === 'PAUSED' || schedule.status === 'COMPLETED') {
    return { success: false, message: 'Schedule is completed, paused or inactive.', sentCount: 0 };
  }

  const currentRunCount = schedule.runCount || 0;
  const maxRuns = schedule.maxExecutions || 0;

  // Check if max execution limit is already reached
  if (maxRuns > 0 && currentRunCount >= maxRuns) {
    // Mark as completed
    const allSchedules = await getWhatsAppSchedules();
    const idx = allSchedules.findIndex(s => s.id === schedule.id);
    if (idx >= 0) {
      allSchedules[idx] = { ...allSchedules[idx], status: 'COMPLETED', isActive: false };
      await saveWhatsAppSchedules(allSchedules);
    }
    return {
      success: false,
      message: `Schedule has reached its maximum limit of ${maxRuns} message(s).`,
      sentCount: 0,
    };
  }

  // 1. Resolve Target Recipients
  let recipients: Array<{ phone: string; name?: string }> = [];

  if (schedule.targetType === 'GROUP' || schedule.targetType === 'COMMUNITY') {
    const allGroups = await getWhatsAppTargetGroups();
    const matched = allGroups.find(
      g => g.id === schedule.targetDestination || g.identifier === schedule.targetDestination || g.name === schedule.targetName
    );
    const identifier = matched ? matched.identifier : schedule.targetDestination;
    const resolvedName = matched ? matched.name : (schedule.targetName || 'WhatsApp Group');

    if (identifier === 'TOURNAMENT_CAPTAINS' || identifier === 'ALL_REGISTERED') {
      try {
        const { data: regs } = await supabaseAdmin
          .from('Participant')
          .select('captainWhatsApp, iglName, squadName, tournamentId, status')
          .eq('status', 'VERIFIED')
          .not('captainWhatsApp', 'is', null);

        if (regs && regs.length > 0) {
          recipients = regs
            .filter(r => r.captainWhatsApp && r.captainWhatsApp.trim().length > 0)
            .map(r => ({
              phone: r.captainWhatsApp,
              name: r.iglName || r.squadName || 'Captain',
            }));
        }
      } catch (err) {
        console.warn('[executeScheduledJob] could not fetch registrations:', err);
      }
    } else if (identifier) {
      recipients.push({
        phone: identifier,
        name: resolvedName,
      });
    }
  } else if (schedule.targetType === 'TOURNAMENT_CAPTAINS' || schedule.targetType === 'ALL_REGISTERED') {
    // Fetch verified tournament registrations from Supabase Participant table
    try {
      let query = supabaseAdmin
        .from('Participant')
        .select('captainWhatsApp, iglName, squadName, tournamentId, status')
        .eq('status', 'VERIFIED')
        .not('captainWhatsApp', 'is', null);

      if (schedule.targetDestination && schedule.targetDestination !== 'ACTIVE_TOURNAMENTS') {
        query = query.eq('tournamentId', schedule.targetDestination);
      }

      const { data: regs } = await query;

      if (regs && regs.length > 0) {
        recipients = regs
          .filter(r => r.captainWhatsApp && r.captainWhatsApp.trim().length > 0)
          .map(r => ({
            phone: r.captainWhatsApp,
            name: r.iglName || r.squadName || 'Captain',
          }));
      }
    } catch (err) {
      console.warn('[executeScheduledJob] could not fetch registrations:', err);
    }
  } else {
    // Single phone number or Custom phone recipient
    if (schedule.targetDestination) {
      recipients.push({
        phone: schedule.targetDestination,
        name: schedule.targetName || 'WhatsApp Target',
      });
    }
  }

  if (recipients.length === 0) {
    return { success: false, message: 'No valid recipient target found for this schedule.', sentCount: 0 };
  }

  // 2. Resolve Message Template (support rotation / sequence)
  let rawTemplate = schedule.messageTemplate;
  if (schedule.messagesSequence && schedule.messagesSequence.length > 0) {
    const seqIdx = currentRunCount % schedule.messagesSequence.length;
    rawTemplate = schedule.messagesSequence[seqIdx] || schedule.messageTemplate;
  }

  const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toLocaleDateString('en-GB');
  const executionNum = currentRunCount + 1;
  const remainingCount = maxRuns > 0 ? Math.max(0, maxRuns - executionNum) : 'Unlimited';

  const formattedMessage = rawTemplate
    .replace(/\{COUNT\}/g, String(executionNum))
    .replace(/\{MAX_COUNT\}/g, maxRuns > 0 ? String(maxRuns) : 'Unlimited')
    .replace(/\{REMAINING\}/g, String(remainingCount))
    .replace(/\{TIME\}/g, nowStr)
    .replace(/\{DATE\}/g, dateStr)
    .replace(/\{SITE_LINK\}/g, 'https://brkesports.com');

  // 3. Dispatch to all resolved recipients
  let successCount = 0;
  let failCount = 0;

  for (const r of recipients) {
    const personalizedText = formattedMessage
      .replace(/\{PLAYER_NAME\}/g, r.name || 'Player')
      .replace(/\{CAPTAIN_NAME\}/g, r.name || 'Captain');

    const result = await sendDirectWhatsappMessage({
      to: r.phone,
      text: personalizedText,
      targetName: r.name || schedule.targetName,
      triggerType: 'SCHEDULED_AUTOMATION',
    });

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // 4. Check if this execution concludes the schedule limit
  const isCompleted = (schedule.frequency === 'ONCE') || (maxRuns > 0 && executionNum >= maxRuns);
  const nextRun = isCompleted ? undefined : calculateNextRunTime(schedule);

  const updatedSchedule: WhatsAppSchedule = {
    ...schedule,
    runCount: executionNum,
    lastRunAt: new Date().toISOString(),
    nextRunAt: nextRun,
    lastStatus: successCount > 0 ? 'SUCCESS' : 'FAILED',
    lastError: failCount > 0 ? `Failed on ${failCount} recipient(s)` : undefined,
    status: isCompleted ? 'COMPLETED' : schedule.status,
    isActive: isCompleted ? false : schedule.isActive,
  };

  const allSchedules = await getWhatsAppSchedules();
  const index = allSchedules.findIndex(s => s.id === schedule.id);
  if (index >= 0) {
    allSchedules[index] = updatedSchedule;
  } else {
    allSchedules.push(updatedSchedule);
  }
  await saveWhatsAppSchedules(allSchedules);

  return {
    success: successCount > 0,
    message: isCompleted
      ? `Dispatched run #${executionNum} of ${maxRuns > 0 ? maxRuns : 1}. Target reached — Schedule COMPLETED.`
      : `Dispatched run #${executionNum} (${remainingCount} remaining). Delivered to ${successCount} target(s).`,
    sentCount: successCount,
  };
}

/**
 * Evaluates and triggers all schedules whose nextRunAt timestamp is due.
 */
export async function runAllDueWhatsAppSchedules(): Promise<{
  executedCount: number;
  results: Array<{ scheduleId: string; title: string; success: boolean; sentCount: number }>;
}> {
  const schedules = await getWhatsAppSchedules();
  const now = Date.now();
  const results = [];
  let executedCount = 0;

  for (const schedule of schedules) {
    if (!schedule.isActive || schedule.status !== 'ACTIVE') continue;

    const nextRunMs = schedule.nextRunAt ? new Date(schedule.nextRunAt).getTime() : 0;
    const isDue = nextRunMs <= now;

    if (isDue) {
      executedCount++;
      const res = await executeScheduledJob(schedule);
      results.push({
        scheduleId: schedule.id,
        title: schedule.title,
        success: res.success,
        sentCount: res.sentCount,
      });
    }
  }

  return { executedCount, results };
}
