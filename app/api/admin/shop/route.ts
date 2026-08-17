import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdminSession, hasPermission } from '@/lib/admin-auth';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Query Payment table for Diamond Orders
    const { data: payments, error } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .like('notes', '%Diamond Order%')
      .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, orders: payments || [] });
  } catch (error: any) {
    console.error('[GET /api/admin/shop]', error);
    return NextResponse.json({ orders: [] });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session, 'manage_deposits')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, action, redeemCode } = body;

    if (!orderId || !action) {
      return NextResponse.json({ message: 'Order ID and action are required.' }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from('Payment')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    if (action === 'DELIVER') {
      const codeNote = redeemCode ? ` [Voucher: ${redeemCode}]` : ' [Delivered to UID]';
      await supabaseAdmin
        .from('Payment')
        .update({
          status: 'VERIFIED',
          notes: `${order.notes || ''}${codeNote}`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Send notification to player
      try {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabaseAdmin.from('Notification').insert([{
          id: notifId,
          userId: order.userId,
          title: 'Diamonds Delivered! 💎',
          message: redeemCode
            ? `Your Diamond Order is ready! Voucher/Redeem Code: ${redeemCode}`
            : 'Your Free Fire Diamonds have been successfully transferred to your UID in-game!',
          isRead: false,
          createdAt: new Date().toISOString(),
        }]);
      } catch {}

      return NextResponse.json({ success: true, message: 'Order marked as delivered and player notified.' });
    }

    return NextResponse.json({ message: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('[PATCH /api/admin/shop]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update order.' }, { status: 500 });
  }
}
