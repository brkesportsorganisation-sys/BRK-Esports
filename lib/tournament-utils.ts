import { Tournament, TournamentStatus } from '@/lib/types';

export function getDynamicTournamentStatus(tournament: Partial<Tournament>): TournamentStatus {
  // If explicitly marked as PENDING, DRAFT, FINISHED, or CANCELLED, always honor it
  if (
    tournament.status === 'PENDING' ||
    tournament.status === 'DRAFT' ||
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

  if (startTime === 0) return tournament.status || 'UPCOMING';

  const now = Date.now();

  if (now < startTime) {
    return 'UPCOMING';
  } else if (now >= startTime && (endTime === 0 || now < endTime)) {
    return 'LIVE';
  } else {
    return 'FINISHED';
  }
}
