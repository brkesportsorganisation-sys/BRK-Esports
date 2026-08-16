import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminSession, requireAdminRole, logAdminAction } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  return verifyAdminSession(token);
}

export async function GET() {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data: requests, error } = await supabaseAdmin
      .from('DeleteRequest')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('[GET /api/admin/delete-requests] Supabase query warning:', error.message);
      return NextResponse.json({ requests: [] });
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (error: any) {
    console.warn('[GET /api/admin/delete-requests]', error);
    return NextResponse.json({ requests: [] });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!requireAdminRole(session, ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'])) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { targetTable, targetId, targetTitle, reason } = body;

    if (!targetTable || !targetId) {
      return NextResponse.json({ message: 'Target table and Target ID are required.' }, { status: 400 });
    }

    const reqId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newRequest = {
      id: reqId,
      requestedBy: session!.email,
      requestedByName: session!.email.split('@')[0],
      targetTable,
      targetId,
      targetTitle: targetTitle || `${targetTable} #${targetId}`,
      reason: reason || 'Requested via Admin Dashboard',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('DeleteRequest')
      .insert([newRequest])
      .select()
      .single();

    if (error) throw new Error(error.message);

    logAdminAction(session!.email, 'DELETE_REQUEST_CREATE', `Created delete request for ${targetTable} #${targetId}`);

    return NextResponse.json({
      request: data,
      message: 'Delete request submitted! It will be reviewed and executed upon Owner approval.',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/admin/delete-requests]', error);
    return NextResponse.json({ message: error?.message || 'Failed to submit delete request.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  // Only SUPER_ADMIN (Owner) can approve delete requests
  if (!requireAdminRole(session, ['SUPER_ADMIN'])) {
    return NextResponse.json({ message: 'Only Platform Owner can approve/reject delete requests.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { requestId, action } = body; // action: 'APPROVE' | 'REJECT'

    if (!requestId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ message: 'Request ID and action (APPROVE|REJECT) are required.' }, { status: 400 });
    }

    const { data: delReq, error: fetchErr } = await supabaseAdmin
      .from('DeleteRequest')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !delReq) {
      return NextResponse.json({ message: 'Delete request not found.' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // Execute the actual deletion on the target table
      const { error: deleteErr } = await supabaseAdmin
        .from(delReq.targetTable)
        .delete()
        .eq('id', delReq.targetId);

      if (deleteErr) {
        console.warn(`Permanent delete on ${delReq.targetTable} warning:`, deleteErr.message);
      }

      await supabaseAdmin
        .from('DeleteRequest')
        .update({
          status: 'APPROVED',
          approvedBy: session!.email,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', requestId);

      logAdminAction(session!.email, 'DELETE_REQUEST_APPROVED', `Owner approved deletion of ${delReq.targetTable} #${delReq.targetId}`);

      return NextResponse.json({ message: `Approved and permanently deleted ${delReq.targetTable} #${delReq.targetId}.` });
    }

    // Reject
    await supabaseAdmin
      .from('DeleteRequest')
      .update({
        status: 'REJECTED',
        approvedBy: session!.email,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', requestId);

    logAdminAction(session!.email, 'DELETE_REQUEST_REJECTED', `Owner rejected deletion of ${delReq.targetTable} #${delReq.targetId}`);

    return NextResponse.json({ message: 'Delete request rejected.' });
  } catch (error: any) {
    console.error('[PATCH /api/admin/delete-requests]', error);
    return NextResponse.json({ message: error?.message || 'Failed to process delete request.' }, { status: 500 });
  }
}
