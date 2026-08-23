import { NextRequest, NextResponse } from 'next/server';
import { getChampionsConfig, saveChampionsConfig, DEFAULT_CHAMPIONS_CONFIG } from '@/lib/champions';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getChampionsConfig();

    // Also fetch top registered users for convenient admin autofill
    let users: any[] = [];
    try {
      const { data: supaUsers } = await supabaseAdmin
        .from('User')
        .select('id, name, inGameName, freeFireUid, avatar, earnings, totalWins, totalKills')
        .neq('role', 'VENDOR')
        .order('earnings', { ascending: false })
        .limit(30);

      if (supaUsers && supaUsers.length > 0) {
        users = supaUsers;
      }
    } catch {
      users = db.getUsers().filter(u => u.role !== 'VENDOR').slice(0, 30);
    }

    // Also fetch squads from Team or SiteSetting
    let squads: any[] = [];
    try {
      const { data: supaTeams } = await supabaseAdmin
        .from('Team')
        .select('id, name, tag, logo, captainName, wins')
        .limit(30);

      if (supaTeams && supaTeams.length > 0) {
        squads = supaTeams;
      }
    } catch {}

    return NextResponse.json({
      success: true,
      config,
      availableUsers: users,
      availableSquads: squads,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/champions] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch admin champions.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { config, action } = body;

    if (action === 'RESET_TO_DEFAULT') {
      await saveChampionsConfig(DEFAULT_CHAMPIONS_CONFIG);
      return NextResponse.json({ success: true, message: 'Reset to default successfully.', config: DEFAULT_CHAMPIONS_CONFIG });
    }

    if (!config || !Array.isArray(config.topPodiums)) {
      return NextResponse.json({ error: 'Valid champions configuration is required.' }, { status: 400 });
    }

    const saved = await saveChampionsConfig(config);
    if (!saved) {
      return NextResponse.json({ error: 'Failed to save to database.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Hall of Champions saved and published live to database!',
      config,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/champions] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update champions.' }, { status: 500 });
  }
}
