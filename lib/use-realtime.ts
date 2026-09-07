'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { User, Tournament, Notification as NotificationType } from '@/lib/types';

/**
 * Hook to subscribe to real-time Supabase updates for a specific User (Balance, Wins, Level)
 */
export function useRealtimeUser(userId?: string, onUserUpdate?: (user: User) => void) {
  const onUserUpdateRef = useRef(onUserUpdate);
  onUserUpdateRef.current = onUserUpdate;

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
            if (onUserUpdateRef.current) onUserUpdateRef.current(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

/**
 * Hook to subscribe to real-time in-app Notifications for a specific User
 */
export function useRealtimeNotifications(userId?: string, onNewNotif?: (notif: NotificationType) => void) {
  const onNewNotifRef = useRef(onNewNotif);
  onNewNotifRef.current = onNewNotif;

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
            if (onNewNotifRef.current) onNewNotifRef.current(newNotif);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

/**
 * Hook to subscribe to real-time Tournament updates (Slot count, Room ID/Pass release, Status changes)
 */
export function useRealtimeTournament(tournamentId?: string, onTournamentUpdate?: (t: Tournament) => void) {
  const onTournamentUpdateRef = useRef(onTournamentUpdate);
  onTournamentUpdateRef.current = onTournamentUpdate;

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
            if (onTournamentUpdateRef.current) onTournamentUpdateRef.current(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);
}

/**
 * Hook to subscribe to real-time Broadcast Events (Announcements, 1v1 Duels, Chat)
 */
export function useRealtimeBroadcast(channelName: string, eventName: string, onEvent: (data: any) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: eventName }, (response) => {
        if (response.payload && onEventRef.current) {
          onEventRef.current(response.payload);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, eventName]);
}
