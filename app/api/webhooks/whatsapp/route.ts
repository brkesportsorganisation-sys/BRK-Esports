import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  normalizePhoneNumber,
  sendDirectWhatsappMessage,
  getWhatsAppForwarderConfig,
  forwardChannelMessageToGroups,
} from '@/lib/whatsapp';

// Temporary in-memory anti-spam cache: sender -> lastReplyTimestamp
const recentAutoReplies = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[WhatsApp Webhook Received]', JSON.stringify(payload));

    // 1. CRITICAL: Identify webhook event type and ignore outgoing or system events
    const typeWebhook = payload?.typeWebhook || payload?.event || payload?.type;

    // Explicitly ignore non-incoming message events from Green-API / WaAPI / Zavu
    const ignoredTypes = [
      'outgoingMessageReceived',
      'outgoingAPIMessageReceived',
      'outgoingMessageStatus',
      'stateInstanceChanged',
      'statusInstanceChanged',
      'deviceInfo',
      'quotaExceeded',
    ];

    if (typeWebhook && ignoredTypes.includes(typeWebhook)) {
      return NextResponse.json({ success: true, message: `Ignored event type: ${typeWebhook}` });
    }

    const messageData = payload?.messageData || payload?.data?.message || payload?.data || payload?.message || payload;
    const senderData = payload?.senderData || {};

    // Ignore if marked as outgoing or from self
    if (
      payload?.fromMe === true ||
      senderData?.fromMe === true ||
      messageData?.fromMe === true ||
      payload?.isOutgoing === true ||
      senderData?.isOutgoing === true
    ) {
      return NextResponse.json({ success: true, message: 'Ignored outgoing self-message' });
    }

    // Extract sender / chat ID
    const rawFrom =
      senderData?.chatId ||
      senderData?.sender ||
      messageData?.chatId ||
      messageData?.from ||
      messageData?.sender ||
      payload?.chatId ||
      payload?.from ||
      payload?.recipient ||
      '';

    // Extract message content & caption
    const rawText =
      messageData?.fileMessageData?.caption ||
      messageData?.imageMessageData?.caption ||
      messageData?.textMessageData?.textMessage ||
      messageData?.extendedTextMessageData?.text ||
      messageData?.body ||
      messageData?.text ||
      messageData?.caption ||
      payload?.caption ||
      payload?.text ||
      payload?.body ||
      payload?.message ||
      '';

    // Extract attached image / media URL if present
    const rawImageUrl =
      messageData?.fileMessageData?.downloadUrl ||
      messageData?.imageMessageData?.downloadUrl ||
      messageData?.mediaUrl ||
      payload?.imageUrl ||
      payload?.urlFile ||
      payload?.downloadUrl ||
      '';

    const rawMsgId =
      payload?.idMessage ||
      messageData?.id ||
      messageData?._data?.id?._serialized ||
      payload?.messageId ||
      `wh_${Date.now()}`;

    const from = String(rawFrom).trim();
    const text = String(rawText).trim();

    if (!from || (!text && !rawImageUrl)) {
      return NextResponse.json({ success: true, message: 'No actionable content in webhook' });
    }

    // =========================================================================
    // ⚡ 1. CHECK CHANNEL AUTO-FORWARDER RELAY
    // =========================================================================
    try {
      const forwarderConfig = await getWhatsAppForwarderConfig();

      if (forwarderConfig && forwarderConfig.enabled) {
        const configuredChannel = (forwarderConfig.sourceChannelId || '').trim().toLowerCase();
        const incomingChat = from.toLowerCase();

        // Extract invite code if user entered full URL like https://whatsapp.com/channel/0029Vb3h...
        const channelInviteCode = configuredChannel.includes('whatsapp.com/channel/')
          ? configuredChannel.split('whatsapp.com/channel/')[1]?.replace(/[^a-zA-Z0-9]/g, '')
          : '';

        // Match if incoming chat is a newsletter/channel or matches user's channel identifier/name:
        const isChannelMatch =
          configuredChannel &&
          configuredChannel !== '' &&
          (incomingChat === configuredChannel ||
            incomingChat.includes(configuredChannel) ||
            configuredChannel.includes(incomingChat) ||
            incomingChat.includes('@newsletter') ||
            (channelInviteCode && incomingChat.includes(channelInviteCode)) ||
            (forwarderConfig.sourceChannelName && incomingChat.includes(forwarderConfig.sourceChannelName.toLowerCase())));

        if (isChannelMatch) {
          console.log(`[WhatsApp Forwarder] New message received from source channel (${from}). Relaying to groups...`);
          
          const relayResult = await forwardChannelMessageToGroups({
            message: text,
            imageUrl: rawImageUrl || undefined,
            sourceChannelId: from,
            sourceChannelName: forwarderConfig.sourceChannelName || 'Source Channel',
            sourceMessageId: rawMsgId,
          });

          return NextResponse.json({
            success: true,
            forwarded: true,
            deliveredCount: relayResult.deliveredCount,
            totalTargetGroups: relayResult.totalTargetGroups,
            results: relayResult.results,
          });
        }
      }
    } catch (forwardErr) {
      console.error('[WhatsApp Webhook Forwarder Error]', forwardErr);
    }

    // =========================================================================
    // 💬 2. BOT KEYWORD AUTO-RESPONDER (For direct user DMs ONLY)
    // =========================================================================
    // DO NOT auto-reply to group chats (@g.us), channels (@newsletter), or broadcast lists
    const isGroupOrChannel =
      from.includes('@g.us') ||
      from.includes('@newsletter') ||
      from.includes('@broadcast') ||
      from.includes('@lid');

    if (isGroupOrChannel) {
      return NextResponse.json({ success: true, message: 'Ignored group/channel message for DM auto-reply' });
    }

    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_BOT_CONFIG')
      .maybeSingle();

    if (!setting?.value) {
      return NextResponse.json({ success: true });
    }

    const config = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
    if (!config.autoReplyEnabled) {
      return NextResponse.json({ success: true, message: 'Auto reply is disabled' });
    }

    // Rate-limit: at most 1 auto-reply per sender every 2 minutes to prevent loops
    const now = Date.now();
    const lastReply = recentAutoReplies.get(from) || 0;
    if (now - lastReply < 120000) {
      return NextResponse.json({ success: true, message: 'Auto-reply rate limited for this sender' });
    }

    // Check matched keyword rules
    const lowerText = text.toLowerCase();
    let replyText = '';
    const rules = config.rules || [];

    for (const rule of rules) {
      if (!rule.isActive) continue;
      const matched = (rule.keywords || []).some((kw: string) => lowerText.includes(kw.toLowerCase()));
      if (matched) {
        replyText = rule.replyText;
        break;
      }
    }

    // If no keyword matched, use welcome or fallback if enabled
    if (!replyText && config.welcomeMessageEnabled) {
      replyText = config.welcomeMessage;
    }

    if (replyText) {
      recentAutoReplies.set(from, now);
      // Clean up cache periodically
      if (recentAutoReplies.size > 1000) {
        for (const [k, v] of recentAutoReplies.entries()) {
          if (now - v > 300000) recentAutoReplies.delete(k);
        }
      }

      const formattedFrom = normalizePhoneNumber(from);
      await sendDirectWhatsappMessage({
        to: formattedFrom,
        text: replyText,
        targetName: 'Incoming Player (Bot Auto-Reply)',
        triggerType: 'ROOM_ALERT',
      });
    }

    return NextResponse.json({ success: true, replied: !!replyText });
  } catch (error: any) {
    console.error('[WhatsApp Webhook Error]', error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'WhatsApp Webhook Listener Operational 🟢',
    features: ['Bot Auto-Reply', 'Channel to Group Auto-Forwarder'],
    timestamp: new Date().toISOString(),
  });
}

