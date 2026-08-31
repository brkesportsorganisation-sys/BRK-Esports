import Zavudev from '@zavudev/sdk';
import { supabaseAdmin } from './supabase';
import { getWhatsAppCollections, isMongoConfigured } from './mongodb';
import { WhatsAppSchedule, WhatsAppTargetGroup, WhatsAppMessageLog, WhatsAppFrequency, WhatsAppForwarderConfig, WhatsAppSourceChannel } from './types';

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
  let trimmed = rawPhone.trim();

  // If internal format like grp_120363426443362477_g_us
  if (trimmed.startsWith('grp_') && trimmed.includes('_g_us')) {
    return trimmed.replace('grp_', '').replace('_g_us', '@g.us');
  }

  // Preserve WhatsApp Group JIDs & Channel JIDs (e.g. 120363028392819283@g.us, 120363294829384920@newsletter, @broadcast, @s.whatsapp.net)
  if (
    trimmed.includes('@g.us') || 
    trimmed.includes('@newsletter') || 
    trimmed.includes('@broadcast') || 
    trimmed.includes('@s.whatsapp.net') ||
    trimmed.includes('@temp')
  ) {
    return trimmed;
  }

  // Preserve WhatsApp Group & Channel Links
  if (trimmed.includes('chat.whatsapp.com/') || trimmed.includes('whatsapp.com/channel/')) {
    return trimmed;
  }

  // Check if it's a numeric group ID (starts with 120 and length >= 16 digits)
  const rawDigits = trimmed.replace(/\D/g, '');
  if (/^120\d{14,}/.test(rawDigits)) {
    return `${rawDigits}@g.us`;
  }

  // Preserve Group IDs or targets with letters/spaces (group names)
  if (/[a-zA-Z\s\[\]\|\-_]/.test(trimmed) && !trimmed.startsWith('+88') && !/^\+?\d+$/.test(trimmed)) {
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
  provider: 'DIRECT_QR' | 'NODE_BOT' | 'GREEN_API' | 'WAAPI' | 'ZAVU';
  nodeBotUrl: string;
  nodeBotSecret: string;
  isEnabled: boolean;
  defaultTemplate: string;
  greenApiUrl?: string;
  greenApiInstanceId?: string;
  greenApiToken?: string;
  waapiApiKey?: string;
  waapiInstanceId?: string;
  zavuApiKey?: string;
  apiKey?: string;
}

/**
 * Fetches WhatsApp settings (Direct QR, Green-API, WaAPI or Zavu) from MongoDB Atlas (or Supabase fallback).
 */
export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  let dbProvider: 'DIRECT_QR' | 'NODE_BOT' | 'GREEN_API' | 'WAAPI' | 'ZAVU' = 'NODE_BOT';
  let dbNodeBotUrl = process.env.WHATSAPP_BOT_URL || 'https://ezbd.onrender.com';
  let dbNodeBotSecret = process.env.WHATSAPP_BOT_SECRET || 'blackrock_secret_bot_key_2026';
  let isEnabled = true;
  let defaultTemplate = `🎮 {TOURNAMENT_NAME} 🎮\n\nআপনার ম্যাচের রুম ডিটেইলস:\n🔹 Room ID: {ROOM_ID}\n🔹 Password: {ROOM_PASS}\n\nদ্রুত গেমে জয়েন করুন!`;

  // 1. Try MongoDB first (0% Supabase Egress)
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        const doc = await collections.settings.findOne({ _id: 'gateway_settings' as any });
        if (doc) {
          if (doc.provider) dbProvider = doc.provider;
          if (doc.nodeBotUrl) dbNodeBotUrl = doc.nodeBotUrl;
          if (doc.nodeBotSecret) dbNodeBotSecret = doc.nodeBotSecret;
          if (doc.isEnabled !== undefined) isEnabled = Boolean(doc.isEnabled);
          if (doc.defaultTemplate) defaultTemplate = doc.defaultTemplate;
        }
      }
    } catch (mErr) {
      console.warn('[MongoDB getWhatsAppSettings error]:', mErr);
    }
  }

  return {
    provider: dbProvider || 'NODE_BOT',
    nodeBotUrl: dbNodeBotUrl || 'https://ezbd.onrender.com',
    nodeBotSecret: dbNodeBotSecret || 'blackrock_secret_bot_key_2026',
    isEnabled: isEnabled ?? true,
    defaultTemplate: defaultTemplate,
  };
}

/**
 * Saves WhatsApp gateway settings into MongoDB (or Supabase fallback).
 */
export async function saveWhatsAppSettings(settings: Partial<WhatsAppSettings>): Promise<boolean> {
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        await collections.settings.updateOne(
          { _id: 'gateway_settings' as any },
          { $set: { ...settings, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
        return true;
      }
    } catch (mErr) {
      console.error('[MongoDB saveWhatsAppSettings error]:', mErr);
      return false;
    }
  }

  // Supabase fallback
  try {
    const upserts: Array<{ id: string; key: string; value: string; updatedAt: string }> = [];
    if (settings.nodeBotUrl !== undefined) upserts.push({ id: 'setting_WHATSAPP_BOT_URL', key: 'WHATSAPP_BOT_URL', value: settings.nodeBotUrl, updatedAt: new Date().toISOString() });
    if (settings.nodeBotSecret !== undefined) upserts.push({ id: 'setting_WHATSAPP_BOT_SECRET', key: 'WHATSAPP_BOT_SECRET', value: settings.nodeBotSecret, updatedAt: new Date().toISOString() });
    if (settings.provider !== undefined) upserts.push({ id: 'setting_WHATSAPP_PROVIDER', key: 'WHATSAPP_PROVIDER', value: settings.provider, updatedAt: new Date().toISOString() });
    if (settings.isEnabled !== undefined) upserts.push({ id: 'setting_WHATSAPP_ENABLED', key: 'WHATSAPP_ENABLED', value: String(settings.isEnabled), updatedAt: new Date().toISOString() });
    if (settings.defaultTemplate !== undefined) upserts.push({ id: 'setting_WHATSAPP_ROOM_TEMPLATE', key: 'WHATSAPP_ROOM_TEMPLATE', value: settings.defaultTemplate, updatedAt: new Date().toISOString() });

    if (upserts.length > 0) {
      await supabaseAdmin.from('SiteSetting').upsert(upserts, { onConflict: 'key' });
    }
    return true;
  } catch (sErr) {
    console.error('[Supabase saveWhatsAppSettings error]:', sErr);
    return false;
  }
}

/**
 * Normalizes destination to WaAPI compatible format (e.g. 88017... @c.us or group JID @g.us)
 */
export function formatWaapiChatId(to: string): string {
  if (!to) return '';
  const trimmed = to.trim();
  if (trimmed.includes('@g.us')) {
    return trimmed;
  }
  if (trimmed.includes('@newsletter') || trimmed.includes('@broadcast')) {
    return trimmed;
  }
  if (trimmed.includes('@c.us') || trimmed.includes('@s.whatsapp.net')) {
    return trimmed.replace('@s.whatsapp.net', '@c.us');
  }
  // Detect group identifiers (starts with 120... or formatted as phone-timestamp)
  if (/^120\d{14,}/.test(trimmed) || /^\d{10,}-\d+/.test(trimmed)) {
    return `${trimmed}@g.us`;
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.startsWith('880')) {
    return `${digitsOnly}@c.us`;
  }
  if (digitsOnly.startsWith('01')) {
    return `88${digitsOnly}@c.us`;
  }
  return `${digitsOnly}@c.us`;
}

/**
 * Sends a message via Green-API (Developer Free Tier & Production)
 */
export async function sendGreenApiMessage({
  chatId,
  message,
  apiUrl,
  instanceId,
  apiToken,
}: {
  chatId: string;
  message: string;
  apiUrl?: string;
  instanceId?: string;
  apiToken?: string;
}) {
  const settings = await getWhatsAppSettings();
  const host = (apiUrl || settings.greenApiUrl || 'https://7107.api.greenapi.com').replace(/\/+$/, '');
  const activeId = instanceId || settings.greenApiInstanceId || '710722716896';
  const activeToken = apiToken || settings.greenApiToken;

  if (!activeToken) {
    return { success: false, message: 'Green-API API Token is not configured. Please paste your token in Admin Settings.' };
  }

  const targetChatId = formatWaapiChatId(chatId);

  try {
    const res = await fetch(`${host}/waInstance${activeId}/sendMessage/${activeToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        chatId: targetChatId,
        message,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data?.idMessage === undefined && data?.error)) {
      return {
        success: false,
        message: data?.message || data?.error || `Green-API request failed (${res.status})`,
        data,
      };
    }

    return {
      success: true,
      message: `Delivered via Green-API to ${targetChatId}`,
      data,
    };
  } catch (err: any) {
    console.error('[sendGreenApiMessage Error]', err);
    return {
      success: false,
      message: err?.message || 'Failed to send message via Green-API.',
      error: err,
    };
  }
}

/**
 * Sends an image or file with caption via Green-API (100% Free Developer Tier)
 */
export async function sendGreenApiFile({
  chatId,
  urlFile,
  fileName = 'banner.jpg',
  caption,
  apiUrl,
  instanceId,
  apiToken,
}: {
  chatId: string;
  urlFile: string;
  fileName?: string;
  caption?: string;
  apiUrl?: string;
  instanceId?: string;
  apiToken?: string;
}) {
  const settings = await getWhatsAppSettings();
  const host = (apiUrl || settings.greenApiUrl || 'https://7107.api.greenapi.com').replace(/\/+$/, '');
  const activeId = instanceId || settings.greenApiInstanceId || '710722716896';
  const activeToken = apiToken || settings.greenApiToken;

  if (!activeToken) {
    return { success: false, message: 'Green-API API Token is not configured. Please paste your token in Admin Settings.' };
  }

  const targetChatId = formatWaapiChatId(chatId);

  try {
    const res = await fetch(`${host}/waInstance${activeId}/sendFileByUrl/${activeToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        chatId: targetChatId,
        urlFile,
        fileName,
        caption: caption || '',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data?.idMessage === undefined && data?.error)) {
      return {
        success: false,
        message: data?.message || data?.error || `Green-API sendFileByUrl failed (${res.status})`,
        data,
      };
    }

    return {
      success: true,
      message: `Image with caption delivered via Green-API to ${targetChatId}`,
      data,
    };
  } catch (err: any) {
    console.error('[sendGreenApiFile Error]', err);
    return {
      success: false,
      message: err?.message || 'Failed to send image via Green-API.',
      error: err,
    };
  }
}

/**
 * Fetches all chats & groups from Green-API instance
 */
export async function fetchGreenApiChats(apiUrl?: string, instanceId?: string, apiToken?: string) {
  const settings = await getWhatsAppSettings();
  const host = (apiUrl || settings.greenApiUrl || 'https://7107.api.greenapi.com').replace(/\/+$/, '');
  const activeId = instanceId || settings.greenApiInstanceId || '710722716896';
  const activeToken = apiToken || settings.greenApiToken;

  if (!activeToken) {
    return { success: false, message: 'Green-API API Token is not configured.', chats: [], groups: [] };
  }

  try {
    // Query both getChats (active chat history) AND getContacts (all contacts & groups in account)
    const [chatsRes, contactsRes] = await Promise.allSettled([
      fetch(`${host}/waInstance${activeId}/getChats/${activeToken}`, { signal: AbortSignal.timeout(20000) }),
      fetch(`${host}/waInstance${activeId}/getContacts/${activeToken}`, { signal: AbortSignal.timeout(20000) }),
    ]);

    let chatsData: any[] = [];
    if (chatsRes.status === 'fulfilled' && chatsRes.value.ok) {
      const parsed = await chatsRes.value.json().catch(() => []);
      if (Array.isArray(parsed)) chatsData = parsed;
    }

    let contactsData: any[] = [];
    if (contactsRes.status === 'fulfilled' && contactsRes.value.ok) {
      const parsed = await contactsRes.value.json().catch(() => []);
      if (Array.isArray(parsed)) contactsData = parsed;
    }

    const combinedMap = new Map<string, any>();
    for (const c of [...chatsData, ...contactsData]) {
      const id = String(c.id || c.chatId || '');
      if (!id) continue;
      if (!combinedMap.has(id)) {
        combinedMap.set(id, c);
      } else {
        const prev = combinedMap.get(id);
        combinedMap.set(id, {
          ...prev,
          ...c,
          name: c.name || c.contactName || c.subject || c.formattedTitle || prev.name,
        });
      }
    }

    const groups: WhatsAppTargetGroup[] = [];
    const channels: WhatsAppSourceChannel[] = [];
    const allCombined = Array.from(combinedMap.values());

    for (const c of allCombined) {
      const id = String(c.id || c.chatId || '');
      const rawName = c.name || c.contactName || c.subject || c.formattedTitle;
      const isNewsletter = id.endsWith('@newsletter') || id.includes('newsletter') || c.type === 'newsletter' || c.isNewsletter;
      const isGroup = id.endsWith('@g.us') || id.includes('@g.us') || c.type === 'group' || c.isGroup;

      if (isNewsletter) {
        channels.push({
          id: `chan_${id.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: rawName || 'WhatsApp Channel',
          channelId: id,
          description: 'Followed WhatsApp Channel',
        });
      } else if (isGroup) {
        const name = rawName || `WhatsApp Group (${id.slice(0, 15)})`;
        groups.push({
          id: `grp_${id.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: name,
          category: name.toLowerCase().includes('scrim') ? 'SCRIMS_VIP' : name.toLowerCase().includes('tour') ? 'TOURNAMENT_MAIN' : 'GENERAL',
          identifier: id,
          description: 'Synced from WhatsApp account',
          createdAt: new Date().toISOString(),
        });
      }
    }

    return {
      success: true,
      totalChats: allCombined.length,
      chats: allCombined,
      groups,
      channels,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to fetch chats from WhatsApp.',
      chats: [],
      groups: [],
      channels: [],
    };
  }
}

/**
 * Sends a message via WaAPI instance
 */
export async function sendWaapiMessage({
  chatId,
  message,
  instanceId,
  apiKey,
}: {
  chatId: string;
  message: string;
  instanceId?: string;
  apiKey?: string;
}) {
  const settings = await getWhatsAppSettings();
  const activeKey = apiKey || settings.waapiApiKey;
  const activeInstance = instanceId || settings.waapiInstanceId || '102791';

  if (!activeKey) {
    return { success: false, message: 'WaAPI API Token is not configured. Please enter your API Token in Admin Settings.' };
  }

  const targetChatId = formatWaapiChatId(chatId);

  try {
    const res = await fetch(`https://waapi.app/api/v1/instances/${activeInstance}/client/action/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: targetChatId,
        message,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: data?.message || data?.error || `WaAPI request failed (${res.status})`,
        data,
      };
    }

    return {
      success: true,
      message: `Delivered via WaAPI to ${targetChatId}`,
      data,
    };
  } catch (err: any) {
    console.error('[sendWaapiMessage Error]', err);
    return {
      success: false,
      message: err?.message || 'Failed to send message via WaAPI.',
      error: err,
    };
  }
}

/**
 * Fetches all chats & groups from WaAPI instance
 */
export async function fetchWaapiChats(instanceId?: string, apiKey?: string) {
  const settings = await getWhatsAppSettings();
  const activeKey = apiKey || settings.waapiApiKey;
  const activeInstance = instanceId || settings.waapiInstanceId || '102791';

  if (!activeKey) {
    return { success: false, message: 'WaAPI API Token is not configured.', chats: [], groups: [] };
  }

  try {
    const res = await fetch(`https://waapi.app/api/v1/instances/${activeInstance}/client/action/get-chats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: json?.message || `Failed to fetch chats from WaAPI: ${res.status}`,
        chats: [],
        groups: [],
      };
    }

    const rawList = Array.isArray(json?.data?.data)
      ? json.data.data
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
      ? json
      : [];

    const groups: WhatsAppTargetGroup[] = [];
    const channels: WhatsAppSourceChannel[] = [];
    const chats: any[] = [];

    for (const item of rawList) {
      const idStr = typeof item.id === 'object' ? item.id?._serialized || item.id?.user : String(item.id || '');
      const isNewsletter = idStr.includes('@newsletter') || item.isNewsletter === true;
      const isGroup = item.isGroup === true || idStr.includes('@g.us');
      const name = item.name || item.formattedTitle || (isNewsletter ? 'WhatsApp Channel' : isGroup ? 'WhatsApp Group' : idStr);

      if (isNewsletter && idStr) {
        channels.push({
          id: `chan_waapi_${idStr.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: name,
          channelId: idStr,
          description: 'Followed WhatsApp Channel',
        });
      } else if (isGroup && idStr) {
        groups.push({
          id: `grp_waapi_${idStr.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: name,
          category: name.toLowerCase().includes('scrim') ? 'SCRIMS_VIP' : name.toLowerCase().includes('tour') ? 'TOURNAMENT_MAIN' : 'GENERAL',
          identifier: idStr,
          description: `Synced WhatsApp Group (${idStr})`,
          memberCount: item.groupMetadata?.participants?.length || item.unreadCount || 0,
          createdAt: new Date().toISOString(),
        });
      }

      chats.push({
        id: idStr,
        name,
        isGroup,
        isNewsletter,
        unreadCount: item.unreadCount || 0,
      });
    }

    return {
      success: true,
      totalChats: rawList.length,
      groupsCount: groups.length,
      channelsCount: channels.length,
      groups,
      channels,
      chats,
    };
  } catch (err: any) {
    console.error('[fetchWaapiChats Error]', err);
    return {
      success: false,
      message: err?.message || 'Network error while fetching chats from WaAPI.',
      chats: [],
      groups: [],
      channels: [],
    };
  }
}

/**
 * Initializes the Zavudev client instance.
 */
export async function getZavuClient(): Promise<{ client: Zavudev | null; error?: string }> {
  const settings = await getWhatsAppSettings();

  if (!settings.zavuApiKey && !settings.apiKey) {
    return {
      client: null,
      error: 'Zavu API key is missing. Please set ZAVU_API_KEY in environment variables or Admin Settings.',
    };
  }

  try {
    const client = new Zavudev({ apiKey: settings.zavuApiKey || settings.apiKey });
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
 * Sends Match Room ID and Password to a player via WhatsApp (WaAPI or Zavu).
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

  let text = customMessage;
  if (!text) {
    text = settings.defaultTemplate
      .replace(/\{TOURNAMENT_NAME\}/g, tournamentTitle)
      .replace(/\{ROOM_ID\}/g, roomId)
      .replace(/\{ROOM_PASS\}/g, pass)
      .replace(/\{PLAYER_NAME\}/g, playerName);
  }

  return sendDirectWhatsappMessage({
    to: formattedPhone,
    text,
    targetName: playerName,
    triggerType: 'ROOM_ALERT',
  });
}

/**
 * Sends a generic direct message to a destination phone or group via WhatsApp (WaAPI or Zavu).
 */
export async function sendDirectWhatsappMessage({
  to,
  text,
  imageUrl,
  mediaUrl,
  targetName = 'Contact',
  triggerType = 'INSTANT_BROADCAST',
}: {
  to: string;
  text: string;
  imageUrl?: string;
  mediaUrl?: string;
  targetName?: string;
  triggerType?: 'SCHEDULED_AUTOMATION' | 'INSTANT_BROADCAST' | 'ROOM_ALERT' | 'TEST' | 'CHANNEL_FORWARD';
}) {
  const formattedTo = normalizePhoneNumber(to);
  if (!formattedTo || formattedTo.length < 5) {
    return { success: false, message: `Invalid phone/chat format: ${to}` };
  }

  const settings = await getWhatsAppSettings();
  const activeImageUrl = imageUrl || mediaUrl;

  // 1. Send via Node Bot API (Render / Self-hosted Baileys)
  if (settings.provider === 'NODE_BOT' && settings.nodeBotUrl && settings.nodeBotSecret) {
    try {
      const host = settings.nodeBotUrl.replace(/\/+$/, '');
      const endpoint = '/api/send-direct';
      const payload = {
        to: formattedTo,
        message: text,
        imageUrl: activeImageUrl,
      };

      const res = await fetch(`${host}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': settings.nodeBotSecret,
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok && resData.success) {
        await addWhatsAppLog({
          targetDestination: formattedTo,
          targetName,
          messageText: text,
          imageUrl: activeImageUrl,
          triggerType,
          status: 'SENT',
          responseId: resData.messageId || 'node_bot_sent',
        });
        return { success: true, message: `Sent via Node Bot to ${formattedTo}` };
      } else {
        const errorMsg = resData.error || resData.message || `Node Bot returned HTTP ${res.status}`;
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.warn(`[Node Bot] Dispatch failed: ${err.message}`);
      await addWhatsAppLog({
        targetDestination: formattedTo,
        targetName,
        messageText: text,
        imageUrl: activeImageUrl,
        triggerType,
        status: 'FAILED',
        error: err.message,
      });
      return { success: false, message: err.message, error: err };
    }
  }

  // 2. Send via Direct WhatsApp QR Session or Green-API Gateway
  if (settings.provider === 'GREEN_API' && settings.greenApiToken) {
    let greenRes: any;

    // Validate image URL: must be an absolute public URL (not localhost, relative, or blob)
    const isValidPublicImageUrl = activeImageUrl &&
      /^https?:\/\//i.test(activeImageUrl) &&
      !activeImageUrl.includes('localhost') &&
      !activeImageUrl.includes('127.0.0.1') &&
      !activeImageUrl.startsWith('blob:') &&
      !activeImageUrl.startsWith('/');

    if (isValidPublicImageUrl) {
      greenRes = await sendGreenApiFile({
        chatId: formattedTo,
        urlFile: activeImageUrl!,
        caption: text,
        apiUrl: settings.greenApiUrl,
        instanceId: settings.greenApiInstanceId,
        apiToken: settings.greenApiToken,
      });

      if (!greenRes.success) {
        console.warn(`[Green-API] Image send failed (${greenRes.message}). Falling back to text-only...`);
        greenRes = await sendGreenApiMessage({
          chatId: formattedTo,
          message: text,
          apiUrl: settings.greenApiUrl,
          instanceId: settings.greenApiInstanceId,
          apiToken: settings.greenApiToken,
        });
      }
    } else {
      greenRes = await sendGreenApiMessage({
        chatId: formattedTo,
        message: text,
        apiUrl: settings.greenApiUrl,
        instanceId: settings.greenApiInstanceId,
        apiToken: settings.greenApiToken,
      });
    }

    await addWhatsAppLog({
      targetDestination: formattedTo,
      targetName,
      messageText: text,
      imageUrl: activeImageUrl,
      triggerType,
      status: greenRes.success ? 'SENT' : 'FAILED',
      responseId: (greenRes.data as any)?.idMessage || 'green_api_sent',
      error: greenRes.success ? undefined : greenRes.message,
    });

    return greenRes;
  }

  // 3. Send via WaAPI if configured
  if (settings.provider === 'WAAPI' && settings.waapiApiKey) {
    const waapiRes = await sendWaapiMessage({
      chatId: formattedTo,
      message: activeImageUrl ? `${text}\n\n🖼️ Media: ${activeImageUrl}` : text,
      instanceId: settings.waapiInstanceId,
      apiKey: settings.waapiApiKey,
    });

    if (waapiRes.success) {
      await addWhatsAppLog({
        targetDestination: formattedTo,
        targetName,
        messageText: text,
        triggerType,
        status: 'SENT',
        responseId: (waapiRes.data as any)?.id || 'waapi_sent',
      });
      return waapiRes;
    }

    // If destination is a WhatsApp Group (@g.us), WaAPI is strictly required
    if (formattedTo.includes('@g.us') || formattedTo.includes('chat.whatsapp.com')) {
      let friendlyError = waapiRes.message;
      if (friendlyError.includes('trial') || friendlyError.includes('Trial')) {
        friendlyError = '⚠️ WaAPI Trial Limit: Free Trial অ্যাকাউন্টে WhatsApp Group-এ মেসেজ পাঠানো যায় না। WaAPI প্ল্যান আপগ্রেড প্রয়োজন।';
      }
      await addWhatsAppLog({
        targetDestination: formattedTo,
        targetName,
        messageText: text,
        triggerType,
        status: 'FAILED',
        error: friendlyError,
      });
      return { success: false, message: friendlyError };
    }

    console.warn(`[WhatsApp] WaAPI dispatch failed (${waapiRes.message}). Falling back to Zavu for ${formattedTo}...`);
  }


  // 3. DIRECT_QR fallback for simple wa.me links
  return { 
    success: false, 
    message: 'No valid backend configured. Please configure Node Bot in settings.' 
  };
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

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
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

    if (i < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
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
    id: 'grp_registered_captains',
    name: 'All Registered Squad Captains (Dynamic 👥)',
    category: 'REGISTRATION_GROUP',
    identifier: 'TOURNAMENT_CAPTAINS',
    description: 'Dynamic recipient group targeting all verified team captains from active tournaments.',
    memberCount: 0,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SCHEDULES: WhatsAppSchedule[] = [];

/**
 * Loads all WhatsApp scheduled jobs from MongoDB (or Supabase fallback).
 * Filters out any legacy demo mock data.
 */
export async function getWhatsAppSchedules(): Promise<WhatsAppSchedule[]> {
  // 1. MongoDB first (0% Supabase Egress)
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        const docs = await collections.schedules.find({}).toArray();
        if (Array.isArray(docs) && docs.length > 0) {
          const cleaned = docs.map(d => {
            const { _id, ...rest } = d;
            return rest as WhatsAppSchedule;
          }).filter(s => s.id !== 'sched_room_reminder_9pm' && s.id !== 'sched_daily_reg_promo');
          return cleaned;
        }
      }
    } catch (mErr) {
      console.warn('[MongoDB getWhatsAppSchedules error]:', mErr);
    }
  }

  // 2. Supabase fallback
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_AUTOMATION_SCHEDULES')
      .maybeSingle();

    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      if (Array.isArray(parsed)) {
        const realSchedules = parsed.filter(s => 
          s.id !== 'sched_room_reminder_9pm' && 
          s.id !== 'sched_daily_reg_promo'
        );
        return realSchedules;
      }
    }
  } catch (err) {
    console.warn('[getWhatsAppSchedules] could not load from SiteSetting:', err);
  }

  return [];
}

/**
 * Saves all WhatsApp scheduled jobs to MongoDB (or Supabase fallback).
 */
export async function saveWhatsAppSchedules(schedules: WhatsAppSchedule[]): Promise<boolean> {
  // 1. MongoDB first
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        // Bulk replace / sync schedules collection
        await collections.schedules.deleteMany({});
        if (schedules.length > 0) {
          const docs = schedules.map(s => ({ ...s, _id: s.id as any }));
          await collections.schedules.insertMany(docs);
        }
        return true;
      }
    } catch (mErr) {
      console.error('[MongoDB saveWhatsAppSchedules error]:', mErr);
      return false;
    }
  }

  // 2. Supabase fallback
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
 * Loads all WhatsApp Target Groups from MongoDB (or Supabase fallback).
 */
export async function getWhatsAppTargetGroups(): Promise<WhatsAppTargetGroup[]> {
  // 1. MongoDB first
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        const docs = await collections.groups.find({}).toArray();
        if (Array.isArray(docs) && docs.length > 0) {
          const cleaned = docs.map(d => {
            const { _id, ...rest } = d;
            return rest as WhatsAppTargetGroup;
          }).filter(g => 
            g.identifier !== 'https://chat.whatsapp.com/sample-main-group' &&
            g.identifier !== 'https://chat.whatsapp.com/sample-scrims-vip' &&
            g.id !== 'grp_tournament_main' &&
            g.id !== 'grp_scrims_vip'
          );
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch (mErr) {
      console.warn('[MongoDB getWhatsAppTargetGroups error]:', mErr);
    }
  }

  // 2. Supabase fallback
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_TARGET_GROUPS')
      .maybeSingle();

    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      if (Array.isArray(parsed)) {
        const realGroups = parsed.filter(g => 
          g.identifier !== 'https://chat.whatsapp.com/sample-main-group' &&
          g.identifier !== 'https://chat.whatsapp.com/sample-scrims-vip' &&
          g.id !== 'grp_tournament_main' &&
          g.id !== 'grp_scrims_vip'
        );
        if (realGroups.length > 0) {
          return realGroups;
        }
      }
    }
  } catch (err) {
    console.warn('[getWhatsAppTargetGroups] error:', err);
  }

  return DEFAULT_GROUPS;
}

/**
 * Saves WhatsApp Target Groups to MongoDB (or Supabase fallback).
 */
export async function saveWhatsAppTargetGroups(groups: WhatsAppTargetGroup[]): Promise<boolean> {
  // 1. MongoDB first
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        await collections.groups.deleteMany({});
        if (groups.length > 0) {
          const docs = groups.map(g => ({ ...g, _id: g.id as any }));
          await collections.groups.insertMany(docs);
        }
        return true;
      }
    } catch (mErr) {
      console.error('[MongoDB saveWhatsAppTargetGroups error]:', mErr);
      return false;
    }
  }

  // 2. Supabase fallback
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
 * Loads recent WhatsApp message logs from MongoDB (or Supabase fallback).
 */
export async function getWhatsAppLogs(): Promise<WhatsAppMessageLog[]> {
  // 1. MongoDB first
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        const docs = await collections.logs.find({}).sort({ sentAt: -1 }).limit(100).toArray();
        if (Array.isArray(docs)) {
          return docs.map(d => {
            const { _id, ...rest } = d;
            return rest as WhatsAppMessageLog;
          });
        }
      }
    } catch (mErr) {
      console.warn('[MongoDB getWhatsAppLogs error]:', mErr);
    }
  }

  // 2. Supabase fallback
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_MESSAGE_LOGS')
      .maybeSingle();

    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 100);
      }
    }
  } catch (err) {
    console.warn('[getWhatsAppLogs] error:', err);
  }

  return [];
}

/**
 * Records a new WhatsApp message log with lightweight footprint.
 */
export async function addWhatsAppLog(log: Omit<WhatsAppMessageLog, 'id' | 'sentAt'>): Promise<void> {
  const cleanImageUrl = log.imageUrl && log.imageUrl.startsWith('http') ? log.imageUrl : undefined;

  const newLog: WhatsAppMessageLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sentAt: new Date().toISOString(),
    ...log,
    messageText: (log.messageText || '').slice(0, 120),
    imageUrl: cleanImageUrl,
    error: log.error ? String(log.error).slice(0, 100) : undefined,
  };

  // 1. MongoDB first (No limits, ultra fast, 0% Supabase Egress)
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        await collections.logs.insertOne({ ...newLog, _id: newLog.id as any });
        return;
      }
    } catch (mErr) {
      console.warn('[MongoDB addWhatsAppLog error]:', mErr);
    }
  }

  // 2. Supabase fallback
  try {
    const existing = await getWhatsAppLogs();
    const updated = [newLog, ...existing].slice(0, 15);

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
 * Clears all stored WhatsApp message logs from database.
 */
export async function clearWhatsAppLogs(): Promise<boolean> {
  // 1. MongoDB first
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        await collections.logs.deleteMany({});
        return true;
      }
    } catch (mErr) {
      console.error('[MongoDB clearWhatsAppLogs error]:', mErr);
      return false;
    }
  }

  // 2. Supabase fallback
  try {
    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_WHATSAPP_MESSAGE_LOGS',
        key: 'WHATSAPP_MESSAGE_LOGS',
        value: JSON.stringify([]),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    return !error;
  } catch (err) {
    console.error('[clearWhatsAppLogs] error:', err);
    return false;
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
 * Helper to get current Bangladesh (Asia/Dhaka, UTC+6) Date components accurately.
 */
export function getBangladeshNow() {
  const nowUtc = new Date();
  // BD time is fixed UTC + 6 hours (no daylight saving)
  const bdTimeMs = nowUtc.getTime() + 6 * 60 * 60 * 1000;
  const bdDateObj = new Date(bdTimeMs);

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return {
    nowUtc,
    bdYear: bdDateObj.getUTCFullYear(),
    bdMonth: bdDateObj.getUTCMonth(),
    bdDate: bdDateObj.getUTCDate(),
    bdHours: bdDateObj.getUTCHours(),
    bdMinutes: bdDateObj.getUTCMinutes(),
    bdSeconds: bdDateObj.getUTCSeconds(),
    dayOfWeek: days[bdDateObj.getUTCDay()],
  };
}

/**
 * Calculates next run timestamp based on schedule interval and time preferences.
 * Accurately aligns with Bangladesh Standard Time (BST: UTC+6).
 */
export function calculateNextRunTime(schedule: WhatsAppSchedule, options?: { fromTime?: Date; isInitial?: boolean }): string {
  const now = options?.fromTime || new Date();
  const nowMs = now.getTime();

  // 1. One-Time Schedule
  if (schedule.frequency === 'ONCE') {
    if (schedule.scheduledDate) {
      const raw = schedule.scheduledDate.trim();
      // If user typed string like "2026-08-23T20:45" or "2026-08-23 20:45"
      if (!raw.includes('Z') && !raw.includes('+')) {
        const [dPart, tPart] = raw.replace(' ', 'T').split('T');
        if (dPart) {
          const [y, m, d] = dPart.split('-').map(Number);
          const [h, min] = (tPart || '20:00').split(':').map(Number);
          // Convert BD local time components (UTC+6) to UTC timestamp
          const bdUtcMs = Date.UTC(y, (m || 1) - 1, d || 1, h || 0, min || 0, 0) - 6 * 60 * 60 * 1000;
          return new Date(bdUtcMs).toISOString();
        }
      }
      const parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    return new Date(nowMs + 60000).toISOString();
  }

  // 2. Daily Specific Time (e.g. 20:45 / 8:45 PM Bangladesh Time)
  if (schedule.frequency === 'DAILY') {
    const timeStr = schedule.scheduledTime || '20:00';
    const [targetH, targetM] = timeStr.split(':').map(Number);

    const { bdYear, bdMonth, bdDate, bdHours, bdMinutes } = getBangladeshNow();

    // Construct target in Bangladesh Time
    let targetBdDate = new Date(Date.UTC(bdYear, bdMonth, bdDate, targetH || 0, targetM || 0, 0, 0));
    const currentBdDate = new Date(Date.UTC(bdYear, bdMonth, bdDate, bdHours, bdMinutes, 0, 0));

    // If target time has already passed today in Bangladesh, schedule for tomorrow
    if (targetBdDate.getTime() <= currentBdDate.getTime()) {
      targetBdDate.setUTCDate(targetBdDate.getUTCDate() + 1);
    }

    // Convert Bangladesh target timestamp back to real UTC timestamp (-6 hours)
    const nextUtcMs = targetBdDate.getTime() - 6 * 60 * 60 * 1000;
    return new Date(nextUtcMs).toISOString();
  }

  // 3. Recurring Intervals (Every 1m, 2m, 5m, 10m, 15m, 30m, 1h, 2h, 6h, 12h, custom minutes)
  let intervalMs = 60 * 1000;

  switch (schedule.frequency) {
    case 'EVERY_1_MIN':
      intervalMs = 1 * 60 * 1000;
      break;
    case 'EVERY_2_MIN':
      intervalMs = 2 * 60 * 1000;
      break;
    case 'EVERY_5_MIN':
      intervalMs = 5 * 60 * 1000;
      break;
    case 'EVERY_10_MIN':
      intervalMs = 10 * 60 * 1000;
      break;
    case 'EVERY_15_MIN':
      intervalMs = 15 * 60 * 1000;
      break;
    case 'EVERY_30_MIN':
      intervalMs = 30 * 60 * 1000;
      break;
    case 'EVERY_1_HOUR':
      intervalMs = 60 * 60 * 1000;
      break;
    case 'EVERY_2_HOURS':
      intervalMs = 120 * 60 * 1000;
      break;
    case 'EVERY_6_HOURS':
      intervalMs = 360 * 60 * 1000;
      break;
    case 'EVERY_12_HOURS':
      intervalMs = 720 * 60 * 1000;
      break;
    case 'INTERVAL_MINUTES':
      intervalMs = Math.max(1, Number(schedule.intervalMinutes) || 60) * 60 * 1000;
      break;
    default:
      intervalMs = 60 * 60 * 1000;
  }

  let nextTimeMs = nowMs + intervalMs;

  // Active Hours Filtering (e.g. 09:00 - 23:00 BD time)
  if (schedule.activeStartTime && schedule.activeEndTime) {
    const [startH, startM] = schedule.activeStartTime.split(':').map(Number);
    const [endH, endM] = schedule.activeEndTime.split(':').map(Number);

    const nextBdMs = nextTimeMs + 6 * 60 * 60 * 1000;
    const nextBdDate = new Date(nextBdMs);
    const nextBdMinutesOfDay = nextBdDate.getUTCHours() * 60 + nextBdDate.getUTCMinutes();

    const startMinutesOfDay = (startH || 0) * 60 + (startM || 0);
    const endMinutesOfDay = (endH || 23) * 60 + (endM || 59);

    if (nextBdMinutesOfDay < startMinutesOfDay || nextBdMinutesOfDay > endMinutesOfDay) {
      const jumpBdDate = new Date(nextBdMs);
      if (nextBdMinutesOfDay > endMinutesOfDay) {
        jumpBdDate.setUTCDate(jumpBdDate.getUTCDate() + 1);
      }
      jumpBdDate.setUTCHours(startH || 9, startM || 0, 0, 0);
      nextTimeMs = jumpBdDate.getTime() - 6 * 60 * 60 * 1000;
    }
  }

  return new Date(nextTimeMs).toISOString();
}

// Concurrency protection locks
const activeRunningScheduleIds = new Set<string>();
let isEvaluatingDueSchedules = false;

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

  // Prevent concurrent execution of the same schedule
  if (activeRunningScheduleIds.has(schedule.id)) {
    return { success: false, message: 'This schedule is already executing.', sentCount: 0 };
  }
  activeRunningScheduleIds.add(schedule.id);

  try {
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
      const seenIdentifiers = new Set<string>();

      if (schedule.targetDestination === 'ALL_GROUPS') {
        for (const g of allGroups) {
          const ident = g.identifier?.trim();
          // Skip WhatsApp invite links - they cannot receive messages, only @g.us JIDs can
          if (
            ident &&
            !seenIdentifiers.has(ident) &&
            !ident.includes('chat.whatsapp.com/') &&
            !ident.includes('whatsapp.com/channel/')
          ) {
            seenIdentifiers.add(ident);
            recipients.push({
              phone: ident,
              name: g.name || 'WhatsApp Group',
            });
          } else if (ident && (ident.includes('chat.whatsapp.com/') || ident.includes('whatsapp.com/channel/'))) {
            console.warn(`[executeScheduledJob] Skipping group "${g.name}" — identifier is a group invite link, not a JID. Please update to @g.us format.`);
          }
        }
      } else if (schedule.targetDestination.includes(',')) {
        const ids = schedule.targetDestination.split(',').map(s => s.trim()).filter(Boolean);
        for (const id of ids) {
          const matched = allGroups.find(g => g.id === id || g.identifier === id || g.name === id);
          const identifier = (matched ? matched.identifier : id)?.trim();
          const resolvedName = matched ? matched.name : (schedule.targetName || 'WhatsApp Group');
          // Skip invite links and duplicates
          if (
            identifier &&
            !seenIdentifiers.has(identifier) &&
            !identifier.includes('chat.whatsapp.com/') &&
            !identifier.includes('whatsapp.com/channel/')
          ) {
            seenIdentifiers.add(identifier);
            recipients.push({
              phone: identifier,
              name: resolvedName,
            });
          } else if (identifier && (identifier.includes('chat.whatsapp.com/') || identifier.includes('whatsapp.com/channel/'))) {
            console.warn(`[executeScheduledJob] Skipping group "${resolvedName}" — identifier is a group invite link, not a JID. Please update to @g.us format.`);
          }
        }
      } else {
        const matched = allGroups.find(
          g => g.id === schedule.targetDestination || g.identifier === schedule.targetDestination || g.name === schedule.targetName
        );
        let identifier = (matched ? matched.identifier : schedule.targetDestination)?.trim();
        if (identifier && identifier.startsWith('grp_') && identifier.includes('_g_us')) {
          identifier = identifier.replace('grp_', '').replace('_g_us', '@g.us');
        }
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
        } else if (
          identifier &&
          !identifier.includes('chat.whatsapp.com/') &&
          !identifier.includes('whatsapp.com/channel/')
        ) {
          recipients.push({
            phone: identifier,
            name: resolvedName,
          });
        } else if (identifier) {
          console.warn(`[executeScheduledJob] Skipping group "${resolvedName}" — identifier is a group invite link, not a JID. Please update to @g.us format.`);
        }
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

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const personalizedText = formattedMessage
        .replace(/\{PLAYER_NAME\}/g, r.name || 'Player')
        .replace(/\{CAPTAIN_NAME\}/g, r.name || 'Captain');

      const result = await sendDirectWhatsappMessage({
        to: r.phone,
        text: personalizedText,
        imageUrl: schedule.imageUrl || schedule.mediaUrl,
        targetName: r.name || schedule.targetName,
        triggerType: 'SCHEDULED_AUTOMATION',
      });

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.warn(`[executeScheduledJob] Failed to deliver to "${r.name}" (${r.phone}):`, result.message);
      }

      // Small delay between group messages to prevent gateway rate-limiting
      if (i < recipients.length - 1) {
        await new Promise(res => setTimeout(res, 2000));
      }
    }

    // 4. Check if this execution concludes the schedule limit
    const isCompleted = (schedule.frequency === 'ONCE' && successCount > 0) || (maxRuns > 0 && executionNum >= maxRuns && successCount > 0);
    const nextRun = isCompleted ? undefined : calculateNextRunTime(schedule);

    const updatedSchedule: WhatsAppSchedule = {
      ...schedule,
      runCount: successCount > 0 ? executionNum : currentRunCount,
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
      message: successCount > 0
        ? (isCompleted
            ? `Dispatched run #${executionNum} of ${maxRuns > 0 ? maxRuns : 1}. Target reached — Schedule COMPLETED.`
            : `Dispatched run #${executionNum} (${remainingCount} remaining). Delivered to ${successCount} target(s).`)
        : `Failed to deliver to all ${recipients.length} target(s). Check WhatsApp connection status in Admin Panel.`,
      sentCount: successCount,
    };
  } finally {
    activeRunningScheduleIds.delete(schedule.id);
  }
}

/**
 * Evaluates and triggers all schedules whose nextRunAt timestamp is due.
 */
export async function runAllDueWhatsAppSchedules(): Promise<{
  executedCount: number;
  results: Array<{ scheduleId: string; title: string; success: boolean; sentCount: number }>;
}> {
  if (isEvaluatingDueSchedules) {
    return { executedCount: 0, results: [] };
  }
  isEvaluatingDueSchedules = true;

  try {
    const schedules = await getWhatsAppSchedules();
    const now = Date.now();
    const results = [];
    let executedCount = 0;

    for (const schedule of schedules) {
      if (!schedule.isActive || schedule.status !== 'ACTIVE') continue;

      const nextRunMs = schedule.nextRunAt ? new Date(schedule.nextRunAt).getTime() : 0;
      const isDue = nextRunMs <= now;

      if (isDue && !activeRunningScheduleIds.has(schedule.id)) {
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
  } finally {
    isEvaluatingDueSchedules = false;
  }
}

/* ========================================================================= */
/* ⚡ WHATSAPP CHANNEL TO GROUPS AUTO-FORWARDER / RELAY SYSTEM                */
/* ========================================================================= */

export const DEFAULT_FORWARDER_CONFIG: WhatsAppForwarderConfig = {
  enabled: false,
  sourceChannelId: '',
  sourceChannelName: 'WhatsApp Channel',
  savedChannels: [
    {
      id: 'chan_default_1',
      name: 'ESPORTS ZONE BD Official Channel',
      channelId: '',
      description: 'Official verified announcements & notices channel',
      isDefault: true,
    }
  ],
  targetGroupMode: 'ALL_GROUPS',
  targetGroupIds: [],
  forwardFrequencyMode: 'INSTANT_ONCE',
  repeatCount: 1,
  repeatIntervalMinutes: 15,
  activeStartTime: '08:00',
  activeEndTime: '23:30',
  prefixHeader: '📢 *[অফিশিয়াল চ্যানেল আপডেট]*\n\n',
  appendFooter: '',
  includeMedia: true,
  filterKeywords: [],
  ignoreKeywords: [],
  totalForwardedCount: 0,
};

/**
 * Loads the WhatsApp Channel Auto-Forwarder configuration from MongoDB (or Supabase fallback).
 */
export async function getWhatsAppForwarderConfig(): Promise<WhatsAppForwarderConfig> {
  // 1. MongoDB first
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        const doc = await collections.forwarder.findOne({ _id: 'forwarder_config' as any });
        if (doc) {
          const { _id, ...rest } = doc;
          return { ...DEFAULT_FORWARDER_CONFIG, ...rest };
        }
      }
    } catch (mErr) {
      console.warn('[MongoDB getWhatsAppForwarderConfig error]:', mErr);
    }
  }

  // 2. Supabase fallback
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_FORWARDER_CONFIG')
      .maybeSingle();

    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      return { ...DEFAULT_FORWARDER_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('[WhatsApp Forwarder] Could not load config from SiteSetting:', err);
  }
  return DEFAULT_FORWARDER_CONFIG;
}

/**
 * Saves the WhatsApp Channel Auto-Forwarder configuration to MongoDB (or Supabase fallback).
 */
export async function saveWhatsAppForwarderConfig(config: WhatsAppForwarderConfig): Promise<boolean> {
  // 1. MongoDB first
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        await collections.forwarder.updateOne(
          { _id: 'forwarder_config' as any },
          { $set: { ...config, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
        return true;
      }
    } catch (mErr) {
      console.error('[MongoDB saveWhatsAppForwarderConfig error]:', mErr);
      return false;
    }
  }

  // 2. Supabase fallback
  try {
    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_WHATSAPP_FORWARDER_CONFIG',
        key: 'WHATSAPP_FORWARDER_CONFIG',
        value: JSON.stringify(config),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    return !error;
  } catch (err) {
    console.error('[WhatsApp Forwarder] Could not save config:', err);
    return false;
  }
}

export const DEFAULT_BOT_CONFIG = {
  autoReplyEnabled: true,
  welcomeMessageEnabled: true,
  welcomeMessage: `🎮 স্বাগতম ESPORTS ZONE BD-এ! 🎮\n\nআমরা প্রতিদিন নিয়মিত Free Fire টুর্নামেন্ট ও কাস্টম ম্যাচ আয়োজন করি।\n\n🔹 টুর্নামেন্টে যোগ দিতে ভিজিট করুন: https://esportszonebd.online/tournaments\n🔹 রুম ও আইডি সহায়তার জন্য 'room' লিখে পাঠান।\n🔹 ডিপোজিট ও পেমেন্ট সহায়তার জন্য 'bkash' লিখে পাঠান।`,
  defaultFallbackReply: `ধন্যবাদ মেসেজ দেওয়ার জন্য! আমাদের অ্যাডমিন টিম দ্রুত আপনার সাথে যোগাযোগ করবে।\nটুর্নামেন্ট ডিটেইলস জানতে ভিজিট করুন: https://esportszonebd.online`,
  rules: [
    {
      id: 'rule_room',
      keywords: ['room', 'id', 'pass', 'password', 'রুম', 'পাসওয়ার্ড'],
      replyText: `🎮 Room ID & Pass নোটিশ:\n\nআপনার টুর্নামেন্ট শুরু হওয়ার ঠিক ১৫ মিনিট আগে আপনার WhatsApp নম্বরে এবং আমাদের ওয়েবসাইটে Room ID ও Password রিলিজ করা হবে!\n\nসঠিক স্লটে জয়েন করতে esportszonebd.online-এ নজর রাখুন।`,
      isActive: true,
    },
    {
      id: 'rule_bkash',
      keywords: ['bkash', 'nagad', 'payment', 'টাকা', 'পেমেন্ট', 'বিকাশ', 'নগদ'],
      replyText: `💰 পেমেন্ট ও ওয়ালেট ডিপোজিট:\n\nঅটোমেটিক ব্যালেন্স অ্যাড করতে আমাদের সাইটের Wallet অপশনে যান।\nবিকাশ/নগদ সেন্ড মানি করে TrxID সাবমিট করলেই ৫ মিনিটে ব্যালেন্স অ্যাড হয়ে যাবে!\nলিঙ্ক: https://brkesports.com/wallet`,
      isActive: true,
    },
    {
      id: 'rule_stop',
      keywords: ['stop', 'unsubscribe', 'বন্ধ', 'off', 'cancel'],
      replyText: `✅ আপনার অনুরোধ অনুযায়ী আপনাকে নোটিফিকেশন লিস্ট থেকে বাদ দেওয়া হয়েছে। ভবিষ্যতে এই নম্বরে আর কোনো প্রমোশনাল মেসেজ যাবে না। ধন্যবাদ!`,
      isActive: true,
    },
  ],
};

/**
 * Loads WhatsApp Bot auto-reply configuration from MongoDB (or Supabase fallback).
 */
export async function getWhatsAppBotConfig(): Promise<typeof DEFAULT_BOT_CONFIG> {
  // 1. MongoDB first
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        const doc = await collections.bot.findOne({ _id: 'bot_config' as any });
        if (doc) {
          const { _id, ...rest } = doc;
          return { ...DEFAULT_BOT_CONFIG, ...rest } as any;
        }
      }
    } catch (mErr) {
      console.warn('[MongoDB getWhatsAppBotConfig error]:', mErr);
    }
  }

  // 2. Supabase fallback
  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_BOT_CONFIG')
      .maybeSingle();

    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      return { ...DEFAULT_BOT_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('[WhatsApp Bot] Could not load config from SiteSetting:', err);
  }
  return DEFAULT_BOT_CONFIG;
}

/**
 * Saves WhatsApp Bot auto-reply configuration to MongoDB (or Supabase fallback).
 */
export async function saveWhatsAppBotConfig(config: any): Promise<boolean> {
  // 1. MongoDB first
  if (isMongoConfigured()) {
    try {
      const collections = await getWhatsAppCollections();
      if (collections) {
        await collections.bot.updateOne(
          { _id: 'bot_config' as any },
          { $set: { ...config, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
        return true;
      }
    } catch (mErr) {
      console.error('[MongoDB saveWhatsAppBotConfig error]:', mErr);
      return false;
    }
  }

  // 2. Supabase fallback
  try {
    const { error } = await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_WHATSAPP_BOT_CONFIG',
        key: 'WHATSAPP_BOT_CONFIG',
        value: JSON.stringify(config),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    return !error;
  } catch (err) {
    console.error('[WhatsApp Bot] Could not save config:', err);
    return false;
  }
}

/**
 * Relays a message originating from a WhatsApp Channel (or Admin trigger) to all target groups.
 */
export async function forwardChannelMessageToGroups({
  message,
  imageUrl,
  sourceChannelId,
  sourceChannelName,
  sourceMessageId,
  forceTargetGroups,
}: {
  message: string;
  imageUrl?: string;
  sourceChannelId?: string;
  sourceChannelName?: string;
  sourceMessageId?: string;
  forceTargetGroups?: string[];
}): Promise<{
  success: boolean;
  totalTargetGroups: number;
  deliveredCount: number;
  failedCount: number;
  results: Array<{ groupId: string; groupName: string; success: boolean; message: string }>;
}> {
  const config = await getWhatsAppForwarderConfig();
  const allGroups = await getWhatsAppTargetGroups();

  let targetGroups: WhatsAppTargetGroup[] = [];

  if (forceTargetGroups && forceTargetGroups.length > 0) {
    targetGroups = allGroups.filter(
      (g) => forceTargetGroups.includes(g.id) || forceTargetGroups.includes(g.identifier)
    );
    // If not found in allGroups, construct ad-hoc target groups:
    if (targetGroups.length === 0) {
      targetGroups = forceTargetGroups.map((id, idx) => ({
        id: `adhoc_${idx}`,
        name: id.includes('@g.us') ? `WhatsApp Group (${id.split('@')[0]})` : `Group (${id})`,
        category: 'CUSTOM' as const,
        identifier: id,
        createdAt: new Date().toISOString(),
      }));
    }
  } else if (config.targetGroupMode === 'SELECTED_GROUPS' && Array.isArray(config.targetGroupIds) && config.targetGroupIds.length > 0) {
    targetGroups = allGroups.filter(
      (g) => config.targetGroupIds.includes(g.id) || config.targetGroupIds.includes(g.identifier)
    );
    // If some selected group IDs are raw JIDs or not in allGroups, include them directly:
    const matchedSet = new Set(targetGroups.map(g => g.id).concat(targetGroups.map(g => g.identifier)));
    for (const gid of config.targetGroupIds) {
      if (!matchedSet.has(gid)) {
        targetGroups.push({
          id: `custom_grp_${gid}`,
          name: gid.includes('@g.us') ? `WhatsApp Group (${gid.split('@')[0]})` : `Group (${gid})`,
          category: 'CUSTOM' as const,
          identifier: gid,
          createdAt: new Date().toISOString(),
        });
      }
    }
  } else {
    // Default: ALL_GROUPS
    targetGroups = allGroups.filter(g => g.identifier && g.identifier !== 'TOURNAMENT_CAPTAINS');
    if (targetGroups.length === 0) {
      targetGroups = allGroups;
    }
  }

  if (targetGroups.length === 0) {
    return {
      success: false,
      totalTargetGroups: 0,
      deliveredCount: 0,
      failedCount: 0,
      results: [],
    };
  }

  // Check filter keywords if configured
  const cleanMessage = (message || '').trim();
  if (config.filterKeywords && config.filterKeywords.length > 0) {
    const hasMatch = config.filterKeywords.some((kw) =>
      cleanMessage.toLowerCase().includes(kw.trim().toLowerCase())
    );
    if (!hasMatch) {
      return {
        success: true,
        totalTargetGroups: targetGroups.length,
        deliveredCount: 0,
        failedCount: 0,
        results: [{ groupId: 'none', groupName: 'Filter Skipped', success: true, message: 'Message filtered out by keyword rule' }],
      };
    }
  }

  // Check ignore keywords if configured
  if (config.ignoreKeywords && config.ignoreKeywords.length > 0) {
    const shouldIgnore = config.ignoreKeywords.some((kw) =>
      cleanMessage.toLowerCase().includes(kw.trim().toLowerCase())
    );
    if (shouldIgnore) {
      return {
        success: true,
        totalTargetGroups: targetGroups.length,
        deliveredCount: 0,
        failedCount: 0,
        results: [{ groupId: 'none', groupName: 'Ignore Skipped', success: true, message: 'Message ignored by keyword rule' }],
      };
    }
  }

  // Construct formatted broadcast text
  let finalMessage = cleanMessage;
  if (config.prefixHeader && config.prefixHeader.trim()) {
    finalMessage = `${config.prefixHeader.trim()}\n\n${finalMessage}`;
  }
  if (config.appendFooter && config.appendFooter.trim()) {
    finalMessage = `${finalMessage}\n\n${config.appendFooter.trim()}`;
  }

  const results: Array<{ groupId: string; groupName: string; success: boolean; message: string }> = [];
  let deliveredCount = 0;
  let failedCount = 0;

  for (let i = 0; i < targetGroups.length; i++) {
    const group = targetGroups[i];
    const ident = (group.identifier || '').trim();

    if (!ident) {
      failedCount++;
      continue;
    }

    if (ident.includes('chat.whatsapp.com/') || ident.includes('whatsapp.com/channel/')) {
      failedCount++;
      results.push({
        groupId: group.id,
        groupName: group.name,
        success: false,
        message: 'Skipped - group identifier is an invite link instead of @g.us JID',
      });
      continue;
    }

    try {
      const res = await sendDirectWhatsappMessage({
        to: ident,
        text: finalMessage,
        imageUrl: config.includeMedia ? imageUrl : undefined,
        targetName: group.name,
        triggerType: 'CHANNEL_FORWARD',
      });

      if (res.success) {
        deliveredCount++;
        results.push({
          groupId: group.id,
          groupName: group.name,
          success: true,
          message: res.message || 'Delivered to group',
        });
      } else {
        failedCount++;
        results.push({
          groupId: group.id,
          groupName: group.name,
          success: false,
          message: res.message || 'Failed to deliver',
        });
      }
    } catch (err: any) {
      failedCount++;
      results.push({
        groupId: group.id,
        groupName: group.name,
        success: false,
        message: err?.message || 'Dispatch error',
      });
    }

    // Delay between each group message to prevent Green-API gateway rate-limiting
    if (i < targetGroups.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  // Update forwarder execution metadata
  const updatedConfig: WhatsAppForwarderConfig = {
    ...config,
    totalForwardedCount: (config.totalForwardedCount || 0) + (deliveredCount > 0 ? 1 : 0),
    lastForwardedAt: new Date().toISOString(),
    lastForwardedMsgId: sourceMessageId || config.lastForwardedMsgId,
  };
  await saveWhatsAppForwarderConfig(updatedConfig);

  // If repeat frequency is configured and repeatCount > 1, register repeating automated schedule
  if (deliveredCount > 0 && config.forwardFrequencyMode === 'REPEAT_INTERVAL' && (config.repeatCount || 1) > 1) {
    try {
      const remainingRepeats = (config.repeatCount || 1) - 1;
      const intervalMins = Math.max(1, config.repeatIntervalMinutes || 15);
      const existingSchedules = await getWhatsAppSchedules();

      const targetDestinationStr = config.targetGroupMode === 'ALL_GROUPS'
        ? 'ALL_GROUPS'
        : (config.targetGroupIds || []).join(',');

      const targetNameStr = config.targetGroupMode === 'ALL_GROUPS'
        ? `All Connected Groups (${allGroups.length})`
        : `${(config.targetGroupIds || []).length} Selected Groups`;

      const nextRunTime = new Date(Date.now() + intervalMins * 60 * 1000).toISOString();

      const newRepeatingJob: WhatsAppSchedule = {
        id: `sched_fwd_${Date.now()}`,
        title: `🔁 Channel Auto-Repeat: ${(sourceChannelName || 'Channel Post').slice(0, 30)}`,
        description: `Auto-repeating channel forward (${remainingRepeats} remaining, every ${intervalMins}m)`,
        targetType: 'GROUP',
        targetDestination: targetDestinationStr,
        targetName: targetNameStr,
        messageType: 'CUSTOM_TEXT',
        messageTemplate: finalMessage,
        imageUrl: config.includeMedia ? imageUrl : undefined,
        frequency: 'INTERVAL_MINUTES',
        intervalMinutes: intervalMins,
        maxExecutions: remainingRepeats,
        nextRunAt: nextRunTime,
        activeStartTime: config.activeStartTime,
        activeEndTime: config.activeEndTime,
        isActive: true,
        status: 'ACTIVE',
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      existingSchedules.unshift(newRepeatingJob);
      await saveWhatsAppSchedules(existingSchedules);
    } catch (schedErr) {
      console.warn('[forwardChannelMessageToGroups] Repeat schedule registration error:', schedErr);
    }
  }

  return {
    success: deliveredCount > 0,
    totalTargetGroups: targetGroups.length,
    deliveredCount,
    failedCount,
    results,
  };
}

