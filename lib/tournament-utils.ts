import { Tournament, TournamentStatus } from '@/lib/types';

export function getDynamicTournamentStatus(tournament: Partial<Tournament>): TournamentStatus {
  if (tournament.status === 'CANCELLED' || tournament.status === 'DRAFT') {
    return tournament.status;
  }
  if (tournament.isPaused) {
    // If it's paused, we could map it to DRAFT or keep current logic, let's keep it simple.
    // The user might just use DRAFT to pause. We'll return 'DRAFT'.
    return 'DRAFT'; 
  }

  const startTimeStr = tournament.tournamentStart || tournament.matchTime;
  const startTime = startTimeStr ? new Date(startTimeStr).getTime() : 0;

  const endTimeStr = tournament.tournamentEnd;
  const endTime = endTimeStr ? new Date(endTimeStr).getTime() : startTime + 2 * 60 * 60 * 1000;

  if (startTime === 0) return tournament.status || 'UPCOMING';

  const now = Date.now();

  if (now < startTime) {
    return 'UPCOMING';
  } else if (now >= startTime && now < endTime) {
    return 'LIVE';
  } else {
    return 'FINISHED';
  }
}
