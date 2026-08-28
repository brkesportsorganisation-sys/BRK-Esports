import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  normalizePhoneNumber,
  sendDirectWhatsappMessage,
  getWhatsAppForwarderConfig,
  forwardChannelMessageToGroups,
} from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[WhatsApp Webhook Received]', JSON.stringify(payload));

    // Support Green-API, WaAPI, Zavu, and custom webhook payload formats
    const typeWebhook = payload?.typeWebhook || payload?.event || payload?.type;
    const messageData = payload?.messageData || payload?.data?.message || payload?.data || payload?.message || payload;
    const senderData = payload?.senderData || {};

    // Extract sender / chat ID
    const rawFrom =
      senderData?.chatId ||
      senderData?.sender ||
      messageData?.from ||
      messageData?.chatId ||
      messageData?.sender ||
      payload?.from ||
      '';

    // Extract message content
    const rawText =
      messageData?.textMessageData?.textMessage ||
      messageData?.extendedTextMessageData?.text ||
      messageData?.body ||
      messageData?.text ||
      payload?.text ||
      payload?.body ||
      '';

    // Extract attached image / media URL if present
    const rawImageUrl =
      messageData?.fileMessageData?.downloadUrl ||
      messageData?.imageMessageData?.downloadUrl ||
      messageData?.mediaUrl ||
      payload?.imageUrl ||
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

      if (forwarderConfig && forwarderConfig.enabled && forwarderConfig.sourceChannelId) {
        const configuredChannel = forwarderConfig.sourceChannelId.trim().toLowerCase();
        const incomingChat = from.toLowerCase();

        // Match by JID, Newsletter ID, Channel Code or Phone
        const isChannelMatch =
          incomingChat === configuredChannel ||
          incomingChat.includes(configuredChannel) ||
          configuredChannel.includes(incomingChat) ||
          (configuredChannel.includes('whatsapp.com/channel/') &&
            incomingChat.includes(configuredChannel.split('whatsapp.com/channel/')[1]?.replace(/[^a-zA-Z0-9]/g, '')));

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
          });
        }
      }
    } catch (forwardErr) {
      console.error('[WhatsApp Webhook Forwarder Error]', forwardErr);
    }

    // =========================================================================
    // 💬 2. BOT KEYWORD AUTO-RESPONDER (For direct user DMs)
    // =========================================================================
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
      const formattedFrom = normalizePhoneNumber(from);
      await sendDirectWhatsappMessage({
        to: formattedFrom,
        text: replyText,
        targetName: 'Incoming Player (Bot Auto-Reply)',
        triggerType: 'SCHEDULED_AUTOMATION',
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

