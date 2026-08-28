import { Tournament, TournamentStatus, PrizeTier } from '@/lib/types';

export function getDynamicTournamentStatus(tournament: Partial<Tournament>): TournamentStatus {
  // If explicitly marked as PENDING, DRAFT, RUNNING, FINISHED, or CANCELLED, always honor it
  if (
    tournament.status === 'PENDING' ||
    tournament.status === 'DRAFT' ||
    tournament.status === 'RUNNING' ||
    tournament.status === 'FINISHED' ||
    tournament.status === 'CANCELLED'
  ) {
    return tournament.status;
  }

  if (tournament.isPaused) {
    return 'PENDING';
  }

  const startTimeStr = tournament.tournamentStart || tournament.matchTime;
  const startTime = startTimeStr ? new Date(startTimeStr).getTime() : 0;

  const endTimeStr = tournament.tournamentEnd;
  const endTime = endTimeStr ? new Date(endTimeStr).getTime() : (startTime > 0 ? startTime + 2 * 60 * 60 * 1000 : 0);

  const now = Date.now();

  if (startTime > 0 && now >= startTime && (endTime === 0 || now < endTime)) {
    return 'LIVE';
  }
  if (endTime > 0 && now >= endTime) {
    return 'FINISHED';
  }

  if (tournament.status === 'UPCOMING') {
    return 'UPCOMING';
  }

  if (startTime === 0) return tournament.status || 'RUNNING';

  return 'RUNNING';
}

export function parsePrizeDistribution(value: unknown, fallbackRules?: string): PrizeTier[] {
  if (Array.isArray(value) && value.length > 0) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      let parsed = JSON.parse(value);
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch {}
      }
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  if (typeof fallbackRules === 'string' && fallbackRules.includes('<!-- PRIZES:')) {
    try {
      const match = fallbackRules.match(/<!-- PRIZES:([\s\S]*?)-->/);
      if (match && match[1]) {
        let parsed = JSON.parse(match[1]);
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch {}
        }
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [];
}
