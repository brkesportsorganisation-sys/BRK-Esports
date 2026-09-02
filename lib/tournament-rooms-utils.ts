import { Tournament, TournamentRoom, TournamentRoadmapConfig, TournamentStage, TournamentRoadmapRuleItem } from '@/lib/types';

/**
 * Returns game-specific default custom room capacities.
 */
export function getDefaultRoomCapacity(game?: string): number {
  if (!game) return 12;
  const g = game.toUpperCase();
  if (g.includes('FREE_FIRE') || g.includes('FREEFIRE')) return 12; // 12 Squads / 48 Players
  if (g.includes('PUBG') || g.includes('BGMI')) return 20; // 20 Squads / 80 Players
  if (g.includes('VALORANT') || g.includes('MLBB') || g.includes('COD')) return 2; // 2 Teams
  if (g.includes('EFOOTBALL') || g.includes('PES') || g.includes('CHESS')) return 2; // 1v1
  if (g.includes('LUDO')) return 4; // 4 Players
  return 12;
}

/**
 * Formats any room label or identifier into a clean Group format:
 * '1' -> 'Group 1', 'A' -> 'Group 1', '2' -> 'Group 2', 'B' -> 'Group 2', 'Final' -> '🏆 Grand Finals'
 */
export function formatRoomLabel(label?: string | number, roomType?: string): string {
  if (roomType === 'FINAL' || String(label).toLowerCase() === 'final') {
    return '🏆 Grand Finals';
  }
  if (!label) return 'Group 1';
  const str = String(label).trim();
  if (str.toLowerCase() === 'final' || str.toLowerCase() === 'grand finals') {
    return '🏆 Grand Finals';
  }
  if (/^\d+$/.test(str)) {
    return `Group ${str}`;
  }
  if (/^[A-Za-z]$/.test(str)) {
    const num = str.toUpperCase().charCodeAt(0) - 64;
    return `Group ${num > 0 ? num : str}`;
  }
  if (/^group\s*\d+$/i.test(str)) {
    return str.replace(/^group\s*/i, 'Group ');
  }
  return str.startsWith('Group') ? str : `Group ${str}`;
}

/**
 * Generates the next sequential room label ('1' -> '2' -> '3' -> ...)
 */
export function getNextRoomLabel(existingLabels: string[]): string {
  for (let i = 1; i <= 200; i++) {
    const numStr = String(i);
    const letterStr = String.fromCharCode(64 + i);
    const groupStr = `Group ${i}`;
    if (!existingLabels.includes(numStr) && !existingLabels.includes(letterStr) && !existingLabels.includes(groupStr)) {
      return numStr;
    }
  }
  return String(existingLabels.length + 1);
}

/**
 * Generates dynamic initial roadmap configuration based on tournament settings & registered squads.
 */
export function generateDefaultRoadmap(
  tournament: Partial<Tournament>,
  rooms: TournamentRoom[] = []
): TournamentRoadmapConfig {
  const isQualifier = tournament.tournamentBatchFormat === 'QUALIFIER_FINAL';
  const totalSlots = tournament.maxTeams || (rooms.length ? rooms.reduce((acc, r) => acc + (r.capacity || 12), 0) : 24);
  const roomCap = tournament.roomCapacity || getDefaultRoomCapacity(tournament.game);

  // If Independent Standalone Rooms
  if (!isQualifier) {
    const independentStages: TournamentStage[] = rooms.map((room, idx) => ({
      id: `STAGE_${room.id}`,
      stageNumber: idx + 1,
      name: `${formatRoomLabel(room.roomLabel, room.roomType)} Championship`,
      subtitle: `Standalone Match Series • ${room.capacity || roomCap} Squads`,
      status: room.status === 'LIVE' ? 'LIVE' : room.status === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING',
      matchTime: room.matchTime || tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : undefined),
      mapRotation: ['Bermuda', 'Purgatory', 'Kalahari'],
      advancingPerGroup: 1,
      totalAdvancing: 1,
      roomIds: [room.id],
      customRules: `Standalone match room. Top squads by score claim room prize pool.`,
    }));

    return {
      enabled: true,
      pipelineTitle: 'TOURNAMENT SCHEDULE & ROOM ROSTERS',
      pipelineSubtitle: 'Independent standalone match rooms running parallel tournaments.',
      pipelineFormat: 'Format B: Independent Rooms',
      stages: independentStages.length ? independentStages : [
        {
          id: 'STAGE_DEFAULT_1',
          stageNumber: 1,
          name: 'Main Tournament Match',
          subtitle: `Single Room Championship • ${roomCap} Squads`,
          status: 'UPCOMING',
          matchTime: tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : undefined),
          mapRotation: ['Bermuda', 'Purgatory', 'Kalahari'],
          advancingPerGroup: 1,
          totalAdvancing: 1,
        }
      ],
      rules: [
        {
          stepNumber: 1,
          title: 'Independent Room Prize Pools',
          description: 'Each room operates as a standalone tournament. Winners are determined purely by room standings.',
        },
      ],
    };
  }

  // Format A: Qualifier -> Final multi-stage calculation
  const r1Groups = Math.max(1, rooms.filter((r) => r.roomType !== 'FINAL').length || Math.ceil(totalSlots / roomCap));
  const r1Adv = tournament.defaultAdvancementCount || Math.max(2, Math.floor(12 / r1Groups));
  const r2Squads = r1Groups * r1Adv;
  const r2Groups = Math.max(1, Math.ceil(r2Squads / 12));
  const r3Squads = r2Groups * 4;
  const r3Groups = Math.max(1, Math.ceil(r3Squads / 12));

  const stages: TournamentStage[] = [
    {
      id: 'STAGE_1',
      stageNumber: 1,
      name: 'Round 1: Qualifiers',
      subtitle: `${r1Groups} Groups • Top ${r1Adv} Advance`,
      status: tournament.status === 'RUNNING' || tournament.status === 'LIVE' ? 'LIVE' : 'UPCOMING',
      matchTime: tournament.matchTime || (tournament.tournamentStart ? String(tournament.tournamentStart) : undefined),
      mapRotation: ['Bermuda', 'Purgatory', 'Kalahari'],
      advancingPerGroup: r1Adv,
      totalAdvancing: r2Squads,
      roomIds: rooms.filter((r) => r.roomType !== 'FINAL').map((r) => r.id),
      customRules: `Top ${r1Adv} squads with highest cumulative match points auto-qualify for next round.`,
    },
  ];

  if (r2Squads > 12) {
    stages.push({
      id: 'STAGE_2',
      stageNumber: 2,
      name: 'Round 2: Quarter-Finals',
      subtitle: `${r2Groups} Groups • Top 4 Advance`,
      status: 'UPCOMING',
      mapRotation: ['Purgatory', 'Kalahari', 'Alpine'],
      advancingPerGroup: 4,
      totalAdvancing: Math.min(24, r3Squads),
      customRules: 'Top 4 squads from each Quarter-Final group advance to Semi-Finals / Finals.',
    });
  }

  if (r2Squads > 12 && r3Squads > 12) {
    stages.push({
      id: 'STAGE_3',
      stageNumber: 3,
      name: 'Round 3: Semi-Finals',
      subtitle: `${r3Groups} Groups • Top 6 Advance`,
      status: 'UPCOMING',
      mapRotation: ['Kalahari', 'Alpine', 'NexTerra'],
      advancingPerGroup: 6,
      totalAdvancing: 12,
      customRules: 'Top 6 squads from each Semi-Final group qualify for Grand Finals.',
    });
  }

  stages.push({
    id: 'FINALS',
    stageNumber: stages.length + 1,
    name: 'Grand Finals 🏆',
    subtitle: '12 Finalist Squads • Championship Match Series',
    status: tournament.status === 'FINISHED' ? 'COMPLETED' : 'UPCOMING',
    mapRotation: ['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'NexTerra'],
    advancingPerGroup: 1,
    totalAdvancing: 1,
    roomIds: rooms.filter((r) => r.roomType === 'FINAL').map((r) => r.id),
    customRules: '3-5 match series. Grand champion takes the 1st Place Trophy & Prize Pool!',
  });

  return {
    enabled: true,
    pipelineTitle: 'TOURNAMENT ROADMAP & SCHEDULE',
    pipelineSubtitle: 'Multi-Stage tournament progression pipeline, group schedules, and map rotations.',
    pipelineFormat: 'Format A: Qualifier → Final',
    stages,
    rules: [
      {
        stepNumber: 1,
        title: '12 Squads Per Room',
        description: 'Each custom room hosts 12 squads (48 players). Room ID & Password are time-locked and revealed dynamically only to assigned captains.',
      },
      {
        stepNumber: 2,
        title: 'Official Placement Points',
        description: '1st (Booyah): 12 pts, 2nd: 9 pts, 3rd: 8 pts, 4th: 7 pts + 1 pt per kill. AI Scoreboard vision scanner calculates standings instantly.',
      },
      {
        stepNumber: 3,
        title: 'Auto-Advancement to Finals',
        description: 'Top qualifying squads from each round auto-advance to the Championship Final Room for the grand prize pool showdown.',
      },
    ],
    pointSystem: {
      booyahPoints: 12,
      secondPoints: 9,
      thirdPoints: 8,
      killPoints: 1,
    },
  };
}
