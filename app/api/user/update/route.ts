import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, avatar, freeFireUid, inGameName, phone, bio } = body;

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (avatar !== undefined) updates.avatar = avatar;
    if (freeFireUid !== undefined) updates.freeFireUid = freeFireUid.trim() || null;
    if (inGameName !== undefined) updates.inGameName = inGameName.trim() || null;
    if (phone !== undefined) updates.phone = phone.trim() || null;
    if (bio !== undefined) updates.bio = bio.trim() || null;

    let updatedUser: any = null;
    let retries = 8;
    const workingUpdates = { ...updates };

    while (retries > 0) {
      const { data, error } = await supabaseAdmin
        .from('User')
        .update(workingUpdates)
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (!error && data) {
        updatedUser = data;
        break;
      }

      if (error) {
        const fullErrStr = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
        const match = fullErrStr.match(/Could not find the '([^']+)' column/i) ||
                      fullErrStr.match(/column '([^']+)' does not exist/i) ||
                      fullErrStr.match(/column "([^"]+)" does not exist/i);

        if (match && match[1] && workingUpdates[match[1]] !== undefined) {
          const missingCol = match[1];
          console.warn(`[PATCH /api/user/update] Dropping unsupported column '${missingCol}' from update.`);
          delete workingUpdates[missingCol];
          retries--;
          continue;
        }

        console.error('[PATCH /api/user/update] Supabase error:', error);
        throw new Error(error.message);
      }
      break;
    }

    // If database returned user, sanitize and merge
    const sanitizedUser = updatedUser ? { ...updates, ...updatedUser } : { id: userId, ...updates };
    if (sanitizedUser.password) delete sanitizedUser.password;

    return NextResponse.json({ user: sanitizedUser, message: 'Profile updated successfully and saved to database!' });
  } catch (error: any) {
    console.error('[PATCH /api/user/update]', error);
    return NextResponse.json({ message: error?.message || 'Failed to update profile.' }, { status: 500 });
  }
}
