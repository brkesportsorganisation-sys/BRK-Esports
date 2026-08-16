import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query = supabaseAdmin.from('Team').select('*').order('createdAt', { ascending: false });
    if (userId) {
      query = query.eq('captainId', userId);
    }

    const { data: teams, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ teams: teams || [] });
  } catch (error: any) {
    console.error('[GET /api/teams]', error);
    return NextResponse.json({ message: error?.message || 'Failed to fetch teams.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, tag, logo, captainId, captainName } = body;

    if (!name || !tag || !captainId) {
      return NextResponse.json({ message: 'Team name, tag, and captain ID are required.' }, { status: 400 });
    }

    const teamId = `team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inviteCode = `${tag.toUpperCase().replace(/\s+/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;

    const newTeam = {
      id: teamId,
      name: name.trim(),
      tag: tag.trim().toUpperCase(),
      logo: logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      captainId,
      inviteCode,
      createdAt: new Date().toISOString(),
    };

    const { data: createdTeam, error: teamError } = await supabaseAdmin
      .from('Team')
      .insert([newTeam])
      .select()
      .single();

    if (teamError) {
      throw new Error(teamError.message);
    }

    // Add captain as first member
    await supabaseAdmin.from('TeamMember').insert([{
      id: `tm_${Date.now()}`,
      teamId,
      userId: captainId,
      role: 'CAPTAIN',
      joinedAt: new Date().toISOString(),
    }]);

    return NextResponse.json({ team: createdTeam, message: 'Team created successfully!' }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/teams]', error);
    return NextResponse.json({ message: error?.message || 'Failed to create team.' }, { status: 500 });
  }
}
