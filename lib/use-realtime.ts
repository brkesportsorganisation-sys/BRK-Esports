'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { User, Tournament, Notification as NotificationType } from '@/lib/types';

/**
 * Hook to subscribe to real-time Supabase updates for a specific User (Balance, Wins, Level)
 */
export function useRealtimeUser(userId?: string, onUserUpdate?: (user: User) => void) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'User',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as User;
            db.setCurrentUser(updated);
            if (onUserUpdate) onUserUpdate(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onUserUpdate]);
}

/**
 * Hook to subscribe to real-time in-app Notifications for a specific User
 */
export function useRealtimeNotifications(userId?: string, onNewNotif?: (notif: NotificationType) => void) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            const newNotif = payload.new as NotificationType;
            if (onNewNotif) onNewNotif(newNotif);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNewNotif]);
}

/**
 * Hook to subscribe to real-time Tournament updates (Slot count, Room ID/Pass release, Status changes)
 */
export function useRealtimeTournament(tournamentId?: string, onTournamentUpdate?: (t: Tournament) => void) {
  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`tournament-realtime-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Tournament',
          filter: `id=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as Tournament;
            if (onTournamentUpdate) onTournamentUpdate(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, onTournamentUpdate]);
}

/**
 * Hook to subscribe to real-time Broadcast Events (Announcements, 1v1 Duels, Chat)
 */
export function useRealtimeBroadcast(channelName: string, eventName: string, onEvent: (data: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: eventName }, (response) => {
        if (response.payload && onEvent) {
          onEvent(response.payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, eventName, onEvent]);
}
