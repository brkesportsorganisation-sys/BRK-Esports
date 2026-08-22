import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getZavuClient, normalizePhoneNumber, addWhatsAppLog, sendDirectWhatsappMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log('[WhatsApp Webhook Received]', JSON.stringify(payload));

    // Handle incoming message event from Zavu
    const event = payload?.event || payload?.type;
    const messageData = payload?.data || payload?.message || payload;

    const from = messageData?.from || messageData?.sender || messageData?.to;
    const text = (messageData?.text || messageData?.body || '').trim().toLowerCase();

    if (!from || !text) {
      return NextResponse.json({ success: true, message: 'No action needed' });
    }

    // Load Bot Config
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
    let replyText = '';
    const rules = config.rules || [];

    for (const rule of rules) {
      if (!rule.isActive) continue;
      const matched = (rule.keywords || []).some((kw: string) => text.includes(kw.toLowerCase()));
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
  return NextResponse.json({ status: 'WhatsApp Webhook Listener Operational 🟢' });
}
