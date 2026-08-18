import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, userId } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ message: 'Valid subscription object is required.' }, { status: 400 });
    }

    const endpoint = subscription.endpoint;
    const subId = `sub_${Buffer.from(endpoint).toString('base64').substring(0, 32).replace(/[^a-zA-Z0-9]/g, '')}`;

    // Store push subscription in SiteSetting or PushSubscription table
    try {
      await supabaseAdmin.from('SiteSetting').upsert({
        id: `push_${subId}`,
        key: `push_subscription_${subId}`,
        value: JSON.stringify({
          endpoint,
          keys: subscription.keys || {},
          userId: userId || null,
          updatedAt: new Date().toISOString(),
        }),
        updatedAt: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.warn('[push-subscribe] Fallback db insert error:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Push notification subscription registered successfully.',
    });
  } catch (error: any) {
    console.error('[POST /api/notifications/push-subscribe]', error);
    return NextResponse.json({ message: error?.message || 'Failed to register subscription.' }, { status: 500 });
  }
}
