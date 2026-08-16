import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, avatar, freeFireUid, inGameName } = body;

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (avatar !== undefined) updates.avatar = avatar;
    if (freeFireUid !== undefined) updates.freeFireUid = freeFireUid.trim() || null;
    if (inGameName !== undefined) updates.inGameName = inGameName.trim() || null;

    const { data: updatedUser, error } = await supabaseAdmin
      .from('User')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/user/update] Supabase error:', error);
      throw new Error(error.message);
    }

    const { password: _, ...sanitizedUser } = updatedUser;
    return NextResponse.json({ user: sanitizedUser, message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('[PATCH /api/user/update]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update profile.' }, { status: 500 });
  }
}
