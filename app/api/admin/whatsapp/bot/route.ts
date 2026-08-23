import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export interface WhatsAppBotConfig {
  autoReplyEnabled: boolean;
  welcomeMessageEnabled: boolean;
  welcomeMessage: string;
  defaultFallbackReply: string;
  rules: Array<{
    id: string;
    keywords: string[];
    replyText: string;
    isActive: boolean;
  }>;
}

const DEFAULT_BOT_CONFIG: WhatsAppBotConfig = {
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
      id: 'rule_rules',
      keywords: ['rule', 'rules', 'hack', 'নিয়ম', 'হ্যাক'],
      replyText: `📜 BlackRock ম্যাচ রুলস:\n\n1. কোনো হ্যাক বা স্ক্রিপ্ট ব্যবহার করা যাবে না।\n2. পিসি বা এম্যুলেটর সম্পূর্ণ নিষিদ্ধ।\n3. নির্ধারিত সময়ে রুমে জয়েন না করলে রিফান্ড হবে না।\nFair play maintain করুন!`,
      isActive: true,
    },
  ],
};

// GET bot config
export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: setting } = await supabaseAdmin
      .from('SiteSetting')
      .select('value')
      .eq('key', 'WHATSAPP_BOT_CONFIG')
      .maybeSingle();

    let config = DEFAULT_BOT_CONFIG;
    if (setting?.value) {
      const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
      config = { ...DEFAULT_BOT_CONFIG, ...parsed };
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[GET /api/admin/whatsapp/bot]', error);
    return NextResponse.json({ config: DEFAULT_BOT_CONFIG });
  }
}

// POST save bot config
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json({ message: 'Config is required' }, { status: 400 });
    }

    await supabaseAdmin
      .from('SiteSetting')
      .upsert({
        id: 'setting_WHATSAPP_BOT_CONFIG',
        key: 'WHATSAPP_BOT_CONFIG',
        value: JSON.stringify(config),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' });

    return NextResponse.json({ success: true, message: 'WhatsApp Bot configuration saved successfully!' });
  } catch (error: any) {
    console.error('[POST /api/admin/whatsapp/bot]', error);
    return NextResponse.json({ message: error?.message || 'Failed to save bot configuration' }, { status: 500 });
  }
}
