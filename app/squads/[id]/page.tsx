'use client';

import React, { useState, useEffect, use } from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { User, Squad, SquadMember, InGameRole, SquadMemberType, GAME_ROLES_MAP } from '@/lib/types';
import { 
  ShieldCheck, 
  Trophy, 
  Share2, 
  Copy, 
  Check, 
  Trash2, 
  Crown, 
  UserPlus, 
  ArrowRight,
  Loader2,
  Swords,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  Zap,
  Users,
  Shield,
  RefreshCw,
  Edit3,
  Flame,
  Clock,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SquadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'REQUESTS' | 'SETTINGS'>('ROSTER');

  // Invite Player Modal State (Search by Username or Account Number)
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [searchPlayerQuery, setSearchPlayerQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [inviteRole, setInviteRole] = useState<InGameRole>('RUSHER');
  const [inviteType, setInviteType] = useState<SquadMemberType>('PLAYER');
  const [isInviting, setIsInviting] = useState(false);

  // Share Invite Link Modal State
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);

  // Member Role Edit Modal State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SquadMember | null>(null);
  const [editRole, setEditRole] = useState<InGameRole>('RUSHER');
  const [editType, setEditType] = useState<SquadMemberType>('PLAYER');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Settings Edit State
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editBanner, setEditBanner] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRequireApproval, setEditRequireApproval] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDisbanding, setIsDisbanding] = useState(false);

  // Player Profile & Tournament History Inspection State
  const [inspectingPlayerId, setInspectingPlayerId] = useState<string | null>(null);
  const [playerStatsData, setPlayerStatsData] = useState<{ player: any; matchHistory: any[] } | null>(null);
  const [isLoadingPlayerStats, setIsLoadingPlayerStats] = useState(false);

  const handleInspectPlayer = async (userId: string) => {
    setInspectingPlayerId(userId);
    setIsLoadingPlayerStats(true);
    setPlayerStatsData(null);
    try {
      const res = await fetch(`/api/players/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setPlayerStatsData(data);
      }
    } catch (err) {
      console.warn('Failed to load player stats:', err);
    } finally {
      setIsLoadingPlayerStats(false);
    }
  };

  const loadSquad = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/squads/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSquad(data.squad);
        if (data.squad) {
          setEditName(data.squad.name);
          setEditTag(data.squad.tag);
          setEditLogo(data.squad.logoUrl);
          setEditBanner(data.squad.bannerUrl || '');
          setEditDescription(data.squad.description || '');
          setEditRequireApproval(data.squad.requireApprovalToJoin);
        }
      }
    } catch (err) {
      console.warn('Failed to load squad:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          db.setCurrentUser(data.user);
        } else {
          setCurrentUser(db.getCurrentUser());
        }
      })
      .catch(() => setCurrentUser(db.getCurrentUser()));

    loadSquad();
  }, [id]);

  // Live Player Search
  useEffect(() => {
    if (!searchPlayerQuery || searchPlayerQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(searchPlayerQuery.trim())}&currentUserId=${currentUser?.id || ''}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.players || []);
        }
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchPlayerQuery]);

  const isLeader = squad?.leaderId === currentUser?.id;
  const isManager = squad?.members?.some(m => m.userId === currentUser?.id && m.memberType === 'MANAGER' && m.status === 'ACTIVE');
  const canManage = isLeader || isManager;

  const activeMembers = (squad?.members || []).filter(m => m.status === 'ACTIVE');
  const pendingRequests = (squad?.members || []).filter(m => m.status === 'PENDING_APPROVAL');
  const invitedMembers = (squad?.members || []).filter(m => m.status === 'INVITED');

  const gameRoles = (squad && GAME_ROLES_MAP[squad.game]) || GAME_ROLES_MAP['FREE_FIRE'];

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !currentUser) return;

    setIsInviting(true);
    try {
      const res = await fetch(`/api/squads/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          targetUserId: selectedPlayer.id,
          targetUserName: selectedPlayer.name,
          targetUserAvatar: selectedPlayer.avatar,
          targetAccountNumber: selectedPlayer.accountNumber,
          targetFreeFireUid: selectedPlayer.freeFireUid,
          memberType: inviteType,
          inGameRole: inviteRole,
          isJoinRequest: false,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setInviteModalOpen(false);
        setSelectedPlayer(null);
        setSearchPlayerQuery('');
        loadSquad();
      } else {
        alert(data.message || 'Failed to send invitation.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRegenerateInviteToken = async () => {
    if (!currentUser || !confirm('Regenerate invite link? Any previous links will become invalid immediately.')) return;

    setIsRegeneratingToken(true);
    try {
      const res = await fetch(`/api/squads/${id}/invite-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          action: 'REGENERATE',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('New shareable invite link generated!');
        loadSquad();
      }
    } catch {
      alert('Error regenerating token.');
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  const handleApproveRejectRequest = async (memberId: string, action: 'APPROVE_REQUEST' | 'REJECT_REQUEST') => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/squads/${id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          memberId,
          action,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        loadSquad();
      } else {
        alert(data.message || 'Failed to process request.');
      }
    } catch {
      alert('Error processing request.');
    }
  };

  const handleUpdateMemberRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !currentUser) return;

    setIsUpdatingRole(true);
    try {
      const res = await fetch(`/api/squads/${id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          memberId: selectedMember.id,
          action: 'UPDATE_ROLE',
          inGameRole: editRole,
          memberType: editType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setRoleModalOpen(false);
        loadSquad();
      } else {
        alert(data.message || 'Failed to update role.');
      }
    } catch {
      alert('Error updating role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handlePromoteLeader = async (member: SquadMember) => {
    if (!currentUser || !confirm(`Transfer Squad Leadership to ${member.userName}? You will become a regular player.`)) return;

    try {
      const res = await fetch(`/api/squads/${id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          memberId: member.id,
          action: 'PROMOTE_LEADER',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        loadSquad();
      } else {
        alert(data.message || 'Failed to transfer leadership.');
      }
    } catch {
      alert('Error transferring leadership.');
    }
  };

  const handleRemoveMember = async (member: SquadMember) => {
    if (!currentUser) return;
    const isSelf = member.userId === currentUser.id;
    const promptText = isSelf ? 'Are you sure you want to leave this squad?' : `Remove ${member.userName} from squad?`;

    if (!confirm(promptText)) return;

    try {
      const res = await fetch(`/api/squads/${id}/members?userId=${currentUser.id}&memberId=${member.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        if (isSelf) {
          router.push('/teams');
        } else {
          loadSquad();
        }
      } else {
        alert(data.message || 'Failed to remove member.');
      }
    } catch {
      alert('Error removing member.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/squads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          name: editName.trim(),
          tag: editTag.trim().toUpperCase(),
          logoUrl: editLogo,
          bannerUrl: editBanner,
          description: editDescription.trim(),
          requireApprovalToJoin: editRequireApproval,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Squad settings updated successfully!');
        loadSquad();
      } else {
        alert(data.message || 'Failed to save settings.');
      }
    } catch {
      alert('Error saving settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDisbandSquad = async () => {
    if (!currentUser || !confirm(`CRITICAL WARNING: Are you sure you want to permanently disband [${squad?.tag}] ${squad?.name}? This action cannot be undone.`)) return;

    setIsDisbanding(true);
    try {
      const res = await fetch(`/api/squads/${id}?userId=${currentUser.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        alert('Squad has been disbanded.');
        router.push('/teams');
      } else {
        alert(data.message || 'Failed to disband squad.');
      }
    } catch {
      alert('Error disbanding squad.');
    } finally {
      setIsDisbanding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E17] text-white flex flex-col font-body">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="min-h-screen bg-[#0A0E17] text-white flex flex-col font-body">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <h2 className="text-xl font-black">Squad Not Found</h2>
          <p className="text-xs text-slate-400">This squad may have been disbanded or removed.</p>
          <Link href="/teams" className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">
            Back to Squads Hub
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const shareableJoinUrl = typeof window !== 'undefined' ? `${window.location.origin}/squad/join/${squad.inviteToken}` : '';

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col font-body">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ── Squad Hero Profile Banner ── */}
        <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl text-white">
          {/* Banner Background */}
          <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-slate-950">
            {squad.bannerUrl && (
              <img
                src={squad.bannerUrl}
                alt={squad.name}
                className="w-full h-full object-cover opacity-35"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            
            {/* Game Badge */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-slate-700 text-amber-400 text-xs font-black uppercase">
                🎮 {squad.game}
              </span>
            </div>
          </div>

          {/* Overlapping Squad Profile Header */}
          <div className="p-6 sm:p-8 -mt-16 sm:-mt-20 relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              
              <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                <img
                  src={squad.logoUrl}
                  alt={squad.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-amber-500 shadow-2xl bg-slate-950 shrink-0"
                />

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-xs font-black">
                      [{squad.tag}]
                    </span>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-white">
                      {squad.name}
                    </h1>
                  </div>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    {squad.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono pt-1">
                    <span>Leader: <strong className="text-white">{squad.leaderName}</strong></span>
                    <span>•</span>
                    <span>Created: <strong>{new Date(squad.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <button
                  onClick={() => setLinkModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Share Invite Link</span>
                </button>

                {canManage && (
                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 text-xs font-heading font-black uppercase flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer transition-all active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Invite Player</span>
                  </button>
                )}
              </div>

            </div>

            {/* Esports Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Roster</span>
                <div className="text-xl font-black text-white font-mono mt-0.5">{activeMembers.length} / 6</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Matches Played</span>
                <div className="text-xl font-black text-amber-400 font-mono mt-0.5">{squad.matchesPlayed}</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tournament Wins</span>
                <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">{squad.matchesWon}</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Kills</span>
                <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">{squad.totalKills}</div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Sub Navigation Tabs ── */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('ROSTER')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ROSTER'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>SQUAD ROSTER ({activeMembers.length})</span>
          </button>

          {canManage && (
            <button
              onClick={() => setActiveTab('REQUESTS')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'REQUESTS'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>JOIN REQUESTS & INVITES ({pendingRequests.length + invitedMembers.length})</span>
            </button>
          )}

          {canManage && (
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-heading font-black tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SETTINGS'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>SQUAD SETTINGS</span>
            </button>
          )}
        </div>

        {/* ════════════ TAB 1: SQUAD ROSTER ════════════ */}
        {activeTab === 'ROSTER' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeMembers.map((member) => {
                const isMemberLeader = member.isLeader || member.userId === squad.leaderId;
                const isSelf = member.userId === currentUser?.id;

                return (
                  <div
                    key={member.id}
                    className={`bg-slate-900/80 border rounded-3xl p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all ${
                      isMemberLeader
                        ? 'border-amber-500/70 shadow-amber-500/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.userName}`}
                            alt={member.userName}
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-700 bg-slate-950"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-black text-white text-sm">{member.userName}</h4>
                              {isMemberLeader && <span title="Squad Leader">👑</span>}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Account: <strong className="text-slate-300">{member.accountNumber || 'BRE-XXXXXX'}</strong>
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                          isMemberLeader
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : member.memberType === 'MANAGER'
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                            : member.memberType === 'COACH'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {member.memberType}
                        </span>
                      </div>

                      {/* In-Game Role & UID Details */}
                      <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">In-Game Role:</span>
                          <span className="font-black text-amber-400 uppercase">
                            {member.inGameRole || 'PLAYER'}
                          </span>
                        </div>
                        {member.freeFireUid && (
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">Game UID:</span>
                            <span className="text-emerald-400 font-bold">{member.freeFireUid}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                          <span>Joined:</span>
                          <span>{new Date(member.joinedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* View Player Profile & Career Placement History CTA */}
                      <button
                        type="button"
                        onClick={() => handleInspectPlayer(member.userId)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 hover:text-amber-300 text-xs font-heading font-black flex items-center justify-center gap-1.5 border border-slate-800 hover:border-amber-400/40 transition-all cursor-pointer shadow-xs active:scale-98"
                      >
                        <Search className="w-3.5 h-3.5 text-amber-400" />
                        <span>View Profile & Match History</span>
                      </button>
                    </div>

                    {/* Member Controls (Leader / Manager permissions) */}
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/60">
                      {canManage && !isMemberLeader && (
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setEditRole(member.inGameRole || 'RUSHER');
                            setEditType(member.memberType || 'PLAYER');
                            setRoleModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1 border border-slate-700 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-amber-400" />
                          <span>Change Role</span>
                        </button>
                      )}

                      {isLeader && !isMemberLeader && (
                        <button
                          onClick={() => handlePromoteLeader(member)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/30 cursor-pointer"
                          title="Transfer Leadership to this player"
                        >
                          Make Leader
                        </button>
                      )}

                      {(canManage || isSelf) && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/30 cursor-pointer"
                        >
                          {isSelf ? 'Leave Squad' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════ TAB 2: JOIN REQUESTS & INVITES ════════════ */}
        {activeTab === 'REQUESTS' && canManage && (
          <div className="space-y-6">
            {/* Pending Approvals */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-heading font-black text-base">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>Pending Join Requests ({pendingRequests.length})</span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/50 rounded-2xl border border-slate-800">
                  No pending player join requests at the moment.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img src={req.userAvatar} alt={req.userName} className="w-10 h-10 rounded-xl object-cover bg-slate-900" />
                        <div>
                          <h4 className="font-bold text-white text-sm">{req.userName}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">Account: {req.accountNumber}</span>
                          <div className="text-[10px] text-amber-400 mt-0.5">Role: {req.inGameRole}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveRejectRequest(req.id, 'APPROVE_REQUEST')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleApproveRejectRequest(req.id, 'REJECT_REQUEST')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Invites */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-heading font-black text-base">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <span>Outgoing Invitations Awaiting Player Response ({invitedMembers.length})</span>
              </div>

              {invitedMembers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/50 rounded-2xl border border-slate-800">
                  No outgoing invitations waiting for player response.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {invitedMembers.map((inv) => (
                    <div key={inv.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img src={inv.userAvatar} alt={inv.userName} className="w-10 h-10 rounded-xl object-cover bg-slate-900" />
                        <div>
                          <h4 className="font-bold text-white text-sm">{inv.userName}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">Invited as {inv.inGameRole}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveMember(inv)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
                      >
                        Cancel Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ TAB 3: SQUAD SETTINGS ════════════ */}
        {activeTab === 'SETTINGS' && canManage && (
          <div className="space-y-6 max-w-3xl">
            <form onSubmit={handleSaveSettings} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 text-xs font-medium">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-lg font-black font-heading text-white">Edit Squad Profile & Branding</h3>
                <p className="text-xs text-slate-400">Update squad name, tag code, banner image, and recruitment settings.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-slate-300 font-bold uppercase block text-[11px]">Squad Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase block text-[11px]">Squad Tag *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono font-black uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold uppercase block text-[11px]">Squad Logo Avatar URL *</label>
                <input
                  type="url"
                  required
                  value={editLogo}
                  onChange={(e) => setEditLogo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold uppercase block text-[11px]">Squad Top Hero Banner URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={editBanner}
                  onChange={(e) => setEditBanner(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold uppercase block text-[11px]">Squad Bio / Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRequireApproval}
                    onChange={(e) => setEditRequireApproval(e.target.checked)}
                    className="text-amber-500 focus:ring-amber-400 rounded cursor-pointer"
                  />
                  <span className="text-slate-300 font-bold text-xs">
                    Require Leader Approval for Link Joins (Prevent randoms from joining without consent)
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-heading font-black text-xs uppercase rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Squad Profile</span>
                </button>
              </div>
            </form>

            {/* Danger Zone: Disband Squad */}
            {isLeader && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-black font-heading text-sm uppercase">
                  <AlertCircle className="w-4 h-4" />
                  <span>Danger Zone: Disband Squad</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Disbanding this squad will permanently remove the roster and revoke all active invite links. Only the Squad Leader can execute this action.
                </p>
                <button
                  onClick={handleDisbandSquad}
                  disabled={isDisbanding}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase rounded-xl shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  {isDisbanding ? 'Disbanding...' : 'Disband Squad Permanently'}
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ════════════ MODAL 1: INVITE PLAYER SEARCH ════════════ */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <UserPlus className="w-5 h-5" />
                </span>
                <h3 className="font-heading font-black text-lg text-white">Invite Player to Squad</h3>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4 text-xs font-medium">
              
              {/* Search Player by Username or Account Number */}
              <div className="space-y-2">
                <label className="text-slate-300 font-bold uppercase block text-[11px]">
                  Search Player by Username / Account No (`BRE-XXXXXX`) / UID *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Type player username or account number..."
                    value={searchPlayerQuery}
                    onChange={(e) => setSearchPlayerQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {isSearching && (
                    <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Search Results Dropdown List */}
                {searchResults.length > 0 && !selectedPlayer && (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2 space-y-1 max-h-44 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlayer(p);
                          setSearchResults([]);
                        }}
                        className="w-full p-2 rounded-xl hover:bg-slate-900 flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-slate-900" />
                          <div>
                            <div className="font-bold text-white text-xs">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Account: {p.accountNumber}</div>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold">Select</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Player Card */}
                {selectedPlayer && (
                  <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img src={selectedPlayer.avatar} alt={selectedPlayer.name} className="w-10 h-10 rounded-xl object-cover bg-slate-900 border border-amber-500/40" />
                      <div>
                        <div className="font-bold text-white text-xs">{selectedPlayer.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Account: {selectedPlayer.accountNumber}</div>
                        {selectedPlayer.freeFireUid && (
                          <div className="text-[10px] text-emerald-400 font-mono">UID: {selectedPlayer.freeFireUid}</div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPlayer(null)}
                      className="text-xs text-red-400 font-bold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* In-Game Role & Member Type Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase block text-[11px]">Designation Type *</label>
                  <select
                    value={inviteType}
                    onChange={(e) => setInviteType(e.target.value as SquadMemberType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="PLAYER">🎮 Active Player</option>
                    <option value="MANAGER">👔 Team Manager</option>
                    <option value="COACH">🧠 Strategic Coach</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold uppercase block text-[11px]">In-Game Role *</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as InGameRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    {gameRoles.map((r: { role: InGameRole; label: string; icon: string }) => (
                      <option key={r.role} value={r.role}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPlayer || isInviting}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-heading font-black text-xs uppercase rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isInviting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Send Squad Invitation</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ════════════ MODAL 2: SHAREABLE INVITE LINK ════════════ */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl text-white">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Share2 className="w-5 h-5" />
                </span>
                <h3 className="font-heading font-black text-lg text-white">Shareable Squad Invite Link</h3>
              </div>
              <button
                onClick={() => setLinkModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anyone with this link can view your squad roster and submit a request to join:
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
              <input
                type="text"
                readOnly
                value={shareableJoinUrl}
                className="bg-transparent text-xs font-mono text-amber-400 w-full focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareableJoinUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-black shrink-0 flex items-center gap-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🎮 Join my Free Fire Squad [${squad.tag}] ${squad.name} on Black Rock Esports!\n\nLink: ${shareableJoinUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <span>Share to WhatsApp</span>
              </a>

              {canManage && (
                <button
                  onClick={handleRegenerateInviteToken}
                  disabled={isRegeneratingToken}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingToken ? 'animate-spin' : ''}`} />
                  <span>Revoke & Generate New Link</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ════════════ MODAL 3: CHANGE MEMBER ROLE ════════════ */}
      {roleModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl text-white">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Edit3 className="w-5 h-5" />
                </span>
                <h3 className="font-heading font-black text-lg text-white">Change Role for {selectedMember.userName}</h3>
              </div>
              <button
                onClick={() => setRoleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMemberRole} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold uppercase block text-[11px]">Designation Type *</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as SquadMemberType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="PLAYER">🎮 Active Player</option>
                  <option value="MANAGER">👔 Team Manager</option>
                  <option value="COACH">🧠 Strategic Coach</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold uppercase block text-[11px]">In-Game Role *</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as InGameRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  {gameRoles.map((r: { role: InGameRole; label: string; icon: string }) => (
                    <option key={r.role} value={r.role}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRole}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-heading font-black text-xs uppercase rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdatingRole && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Role</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ════════════ MODAL 4: PLAYER PROFILE & TOURNAMENT HISTORY ════════════ */}
      {inspectingPlayerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full space-y-6 shadow-2xl text-white my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg sm:text-xl text-white">Player Esports Profile</h3>
                  <p className="text-xs text-slate-400">Career stats, kills, wins & tournament position records</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setInspectingPlayerId(null);
                  setPlayerStatsData(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {isLoadingPlayerStats ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold">Loading player career & tournament records...</p>
              </div>
            ) : playerStatsData?.player ? (
              <div className="space-y-6">
                
                {/* Player Identity Card */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <img
                      src={playerStatsData.player.avatar}
                      alt={playerStatsData.player.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/80 shadow-md bg-slate-900 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <h4 className="text-base sm:text-lg font-black text-white font-heading">
                          {playerStatsData.player.inGameName || playerStatsData.player.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase">
                          {playerStatsData.player.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                        <span>Account: <strong className="text-slate-200 font-mono">{playerStatsData.player.accountNumber}</strong></span>
                        <span>FF UID: <strong className="text-emerald-400 font-mono">{playerStatsData.player.freeFireUid}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center sm:text-right shrink-0">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Player Status</div>
                    <div className="text-xs font-black text-amber-400 font-heading">ACTIVE ROSTER MEMBER</div>
                  </div>
                </div>

                {/* Career 4-Stat Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Matches</div>
                    <div className="text-lg font-black text-white font-heading">{playerStatsData.player.matchesPlayed}</div>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Total Kills</div>
                    <div className="text-lg font-black text-red-400 font-heading">{playerStatsData.player.totalKills}</div>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Booyah Wins</div>
                    <div className="text-lg font-black text-amber-400 font-heading">{playerStatsData.player.totalWins}</div>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center space-y-0.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Earnings</div>
                    <div className="text-lg font-black text-emerald-400 font-heading">৳{playerStatsData.player.earnings}</div>
                  </div>
                </div>

                {/* Tournament History & Placements Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs sm:text-sm font-heading font-black text-white flex items-center gap-2">
                      <Swords className="w-4 h-4 text-orange-400" />
                      <span>Tournament Matches & Position History</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {playerStatsData.matchHistory?.length || 0} Tournament(s)
                    </span>
                  </div>

                  {playerStatsData.matchHistory && playerStatsData.matchHistory.length > 0 ? (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {playerStatsData.matchHistory.map((m: any) => (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-black text-[10px] uppercase font-mono">
                                {m.gameMode}
                              </span>
                              <h5 className="font-bold text-xs text-white truncate">{m.tournamentTitle}</h5>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-3">
                              <span>Map: {m.map}</span>
                              <span>Prize Pool: <strong className="text-emerald-400">৳{m.prizePool}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase shadow-2xs ${m.positionBadge}`}>
                              {m.position}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500 space-y-1">
                      <ShieldCheck className="w-6 h-6 text-slate-600 mx-auto" />
                      <p>No tournament match placement records found yet.</p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Could not load player profile data.
              </div>
            )}

          </div>
        </div>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
