'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, 
  CheckCircle2, 
  Bell, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  Sparkles, 
  Users, 
  User, 
  MessageSquare, 
  Search, 
  X, 
  Check, 
  Trophy, 
  ShieldAlert, 
  DollarSign, 
  Gamepad2, 
  Gift, 
  Info, 
  Link as LinkIcon, 
  ExternalLink,
  Copy,
  Eye,
  Radio,
  Clock,
  ArrowRight
} from 'lucide-react';

interface NotificationRecipientUser {
  id: string;
  name: string;
  email: string;
  inGameName?: string;
  freeFireUid?: string;
  accountNumber?: string;
  avatar?: string;
  walletBalance?: number;
}

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: 'GENERAL' | 'ROOM_ID' | 'PAYOUT' | 'WARNING' | 'MATCH' | 'SYSTEM' | 'REWARD';
  link?: string;
  isRead: boolean;
  createdAt: string;
  user?: NotificationRecipientUser;
}

interface TournamentItem {
  id: string;
  title: string;
  registeredCount: number;
  maxTeams: number;
  status: string;
}

type AudienceMode = 'ALL' | 'SINGLE' | 'MULTIPLE' | 'TOURNAMENT';
type NotificationCategory = 'GENERAL' | 'ROOM_ID' | 'PAYOUT' | 'WARNING' | 'MATCH' | 'REWARD' | 'SYSTEM';

export default function AdminNotificationsPage() {
  // Composer state
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('GENERAL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionLink, setActionLink] = useState('');

  // Target users state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Data state
  const [availableUsers, setAvailableUsers] = useState<NotificationRecipientUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [availableTournaments, setAvailableTournaments] = useState<TournamentItem[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  // History & actions state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'READ' | 'UNREAD'>('ALL');

  // 1. Fetch notifications history
  const loadNotifications = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/notifications', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 2. Fetch users list for selection
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data.users || []);
      }
    } catch (err) {
      console.warn('Failed to load users for notification picker:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 3. Fetch tournaments list for selection
  const loadTournaments = async () => {
    setLoadingTournaments(true);
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        setAvailableTournaments(data.tournaments || []);
        if (data.tournaments && data.tournaments.length > 0) {
          setSelectedTournamentId(data.tournaments[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load tournaments:', err);
    } finally {
      setLoadingTournaments(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadUsers();
    loadTournaments();
  }, []);

  // Filtered users for search
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return availableUsers;
    const q = userSearchQuery.toLowerCase();
    return availableUsers.filter(u => 
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.inGameName?.toLowerCase().includes(q) ||
      u.freeFireUid?.toLowerCase().includes(q) ||
      u.accountNumber?.toLowerCase().includes(q)
    );
  }, [availableUsers, userSearchQuery]);

  // Selected user objects
  const selectedUserObjects = useMemo(() => {
    return availableUsers.filter(u => selectedUserIds.includes(u.id));
  }, [availableUsers, selectedUserIds]);

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    if (audienceMode === 'SINGLE') {
      setSelectedUserIds([userId]);
    } else {
      setSelectedUserIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  // Select all filtered users
  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => [...new Set([...prev, ...idsToAdd])]);
  };

  // Clear user selection
  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  // Remove single user from selected chips
  const handleRemoveChip = (userId: string) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
  };

  // Presets definition
  const presets = [
    {
      label: '🎮 Room ID & Pass Ready',
      category: 'ROOM_ID' as NotificationCategory,
      title: '🎮 Free Fire Match Room ID Published!',
      message: 'Room ID: [ENTER_ROOM_ID] | Password: [ENTER_PASS]. Please join slot on time. Late entry will not be entertained!',
      link: '/tournaments'
    },
    {
      label: '💰 Payout Notice',
      category: 'PAYOUT' as NotificationCategory,
      title: '💰 Tournament Prize Money Credited!',
      message: 'Congratulations! Your tournament winning cash prize has been successfully credited to your winning wallet.',
      link: '/wallet'
    },
    {
      label: '⚠️ Anti-Cheat Warning',
      category: 'WARNING' as NotificationCategory,
      title: '⚠️ Fair Play & Anti-Cheat Violation Warning',
      message: 'Using 3rd-party injectors, scripts, or emulator bypass tools is strictly prohibited and results in permanent hardware ban.',
      link: ''
    },
    {
      label: '🏆 Match Starting Soon',
      category: 'MATCH' as NotificationCategory,
      title: '🏆 Tournament Match Starts in 15 Minutes',
      message: 'Your registered tournament match is about to begin! Please open Free Fire and prepare your squad.',
      link: '/tournaments'
    },
    {
      label: '🎁 Special Bonus Added',
      category: 'REWARD' as NotificationCategory,
      title: '🎁 Free Bonus Reward Credited',
      message: 'You have received special bonus coins in your Blackrock Esports account. Use them to join tournaments!',
      link: '/profile'
    },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setTitle(preset.title);
    setMessage(preset.message);
    setSelectedCategory(preset.category);
    setActionLink(preset.link);
  };

  // Reuse / Clone past notification
  const handleCloneNotification = (notif: NotificationItem) => {
    setTitle(notif.title);
    setMessage(notif.message);
    if (notif.type) setSelectedCategory(notif.type as NotificationCategory);
    if (notif.link) setActionLink(notif.link);
    if (notif.userId) {
      setAudienceMode('SINGLE');
      setSelectedUserIds([notif.userId]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dispatch Notification
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please fill in both title and message.');
      return;
    }

    if (audienceMode === 'SINGLE' && selectedUserIds.length === 0) {
      alert('Please select a target user to send this notification to.');
      return;
    }

    if (audienceMode === 'MULTIPLE' && selectedUserIds.length === 0) {
      alert('Please select at least one recipient user.');
      return;
    }

    if (audienceMode === 'TOURNAMENT' && !selectedTournamentId) {
      alert('Please select a tournament.');
      return;
    }

    setIsSending(true);
    setSentSuccess(false);

    try {
      let payload: any = {
        title: title.trim(),
        message: message.trim(),
        type: selectedCategory,
        link: actionLink.trim(),
      };

      if (audienceMode === 'ALL') {
        payload.targetGroup = 'ALL';
      } else if (audienceMode === 'SINGLE' || audienceMode === 'MULTIPLE') {
        payload.targetGroup = 'SPECIFIC';
        payload.userIds = selectedUserIds;
      } else if (audienceMode === 'TOURNAMENT') {
        payload.targetGroup = 'TOURNAMENT';
        payload.tournamentId = selectedTournamentId;
      }

      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSentSuccess(true);
        setFeedbackMsg(data.message || `Notification successfully sent to ${data.count || 'all'} players!`);
        setTitle('');
        setMessage('');
        setActionLink('');
        if (audienceMode === 'SINGLE' || audienceMode === 'MULTIPLE') {
          setSelectedUserIds([]);
        }
        await loadNotifications();
        setTimeout(() => setSentSuccess(false), 5000);
      } else {
        alert(data.message || 'Failed to dispatch notification.');
      }
    } catch (err: any) {
      console.error('Notification dispatch error:', err);
      alert('Network error while dispatching notification.');
    } finally {
      setIsSending(false);
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification record?')) return;

    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  // Category Icon helper
  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'ROOM_ID':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"><Gamepad2 className="w-3 h-3" /> Room ID</span>;
      case 'PAYOUT':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><DollarSign className="w-3 h-3" /> Payout</span>;
      case 'WARNING':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200"><ShieldAlert className="w-3 h-3" /> Warning</span>;
      case 'MATCH':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><Trophy className="w-3 h-3" /> Match</span>;
      case 'REWARD':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><Gift className="w-3 h-3" /> Reward</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"><Bell className="w-3 h-3" /> General</span>;
    }
  };

  // Filtered history
  const filteredHistory = useMemo(() => {
    return notifications.filter(n => {
      if (historyFilter === 'READ' && !n.isRead) return false;
      if (historyFilter === 'UNREAD' && n.isRead) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchMsg = n.message?.toLowerCase().includes(q);
        const matchUser = n.user?.name?.toLowerCase().includes(q) || n.user?.email?.toLowerCase().includes(q) || n.user?.inGameName?.toLowerCase().includes(q);
        if (!matchTitle && !matchMsg && !matchUser) return false;
      }
      return true;
    });
  }, [notifications, historyFilter, historySearch]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans text-slate-800">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-red to-brand-orange flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Notification Dispatch Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Send targeted in-app alerts to a single user, multiple chosen users, tournament players, or broadcast to everyone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadNotifications();
              loadUsers();
            }}
            disabled={loadingHistory}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-brand-orange' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Success Alert Banner */}
      {sentSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-emerald-900">Success!</div>
              <div>{feedbackMsg}</div>
            </div>
          </div>
          <button onClick={() => setSentSuccess(false)} className="text-emerald-600 hover:text-emerald-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sent</div>
            <div className="text-xl font-extrabold text-slate-900">{notifications.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Users</div>
            <div className="text-xl font-extrabold text-slate-900">{availableUsers.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unread by Users</div>
            <div className="text-xl font-extrabold text-slate-900">
              {notifications.filter(n => !n.isRead).length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tournaments</div>
            <div className="text-xl font-extrabold text-slate-900">{availableTournaments.length}</div>
          </div>
        </div>
      </div>

      {/* 3. Quick Preset Templates */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-brand-orange" />
            <span>Quick One-Click Templates</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Auto-fills title, message body & category</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-brand-orange hover:border-orange-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs group"
            >
              <span>{p.label}</span>
              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-brand-orange group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      {/* 4. Composer & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Notification Composer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-brand-orange flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Create Notification</h2>
                  <p className="text-xs text-slate-500">Configure target audience, content and alert type</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-5">
              
              {/* Target Audience Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase text-slate-600 tracking-wider">
                  1. Target Audience *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAudienceMode('ALL');
                      setSelectedUserIds([]);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      audienceMode === 'ALL'
                        ? 'border-brand-orange bg-orange-50/60 ring-2 ring-brand-orange/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Users className={`w-4 h-4 ${audienceMode === 'ALL' ? 'text-brand-orange' : 'text-slate-400'}`} />
                      {audienceMode === 'ALL' && <Check className="w-3.5 h-3.5 text-brand-orange" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900 leading-tight">All Users</div>
                      <div className="text-[10px] text-slate-500 font-medium">Broadcast to all</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAudienceMode('SINGLE');
                      if (selectedUserIds.length > 1) setSelectedUserIds([selectedUserIds[0]]);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      audienceMode === 'SINGLE'
                        ? 'border-brand-orange bg-orange-50/60 ring-2 ring-brand-orange/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <User className={`w-4 h-4 ${audienceMode === 'SINGLE' ? 'text-brand-orange' : 'text-slate-400'}`} />
                      {audienceMode === 'SINGLE' && <Check className="w-3.5 h-3.5 text-brand-orange" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900 leading-tight">Single User</div>
                      <div className="text-[10px] text-slate-500 font-medium">Pick 1 player</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceMode('MULTIPLE')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      audienceMode === 'MULTIPLE'
                        ? 'border-brand-orange bg-orange-50/60 ring-2 ring-brand-orange/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Users className={`w-4 h-4 ${audienceMode === 'MULTIPLE' ? 'text-brand-orange' : 'text-slate-400'}`} />
                      {audienceMode === 'MULTIPLE' && <Check className="w-3.5 h-3.5 text-brand-orange" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900 leading-tight">Multiple Users</div>
                      <div className="text-[10px] text-slate-500 font-medium">Select specific list</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudienceMode('TOURNAMENT')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      audienceMode === 'TOURNAMENT'
                        ? 'border-brand-orange bg-orange-50/60 ring-2 ring-brand-orange/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Trophy className={`w-4 h-4 ${audienceMode === 'TOURNAMENT' ? 'text-brand-orange' : 'text-slate-400'}`} />
                      {audienceMode === 'TOURNAMENT' && <Check className="w-3.5 h-3.5 text-brand-orange" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900 leading-tight">Tournament</div>
                      <div className="text-[10px] text-slate-500 font-medium">Joined players</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dynamic User Picker (Single or Multiple Mode) */}
              {(audienceMode === 'SINGLE' || audienceMode === 'MULTIPLE') && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-slate-500" />
                      <span>{audienceMode === 'SINGLE' ? 'Search & Select 1 Player' : 'Select Target Players'}</span>
                    </label>
                    <span className="text-xs font-bold text-brand-orange">
                      {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by Name, Email, Account No, or Free Fire UID..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-orange"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    {userSearchQuery && (
                      <button 
                        type="button" 
                        onClick={() => setUserSearchQuery('')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Quick Select Actions for Multiple */}
                  {audienceMode === 'MULTIPLE' && (
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 pt-1">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="text-brand-orange hover:underline"
                      >
                        Select all {filteredUsers.length} filtered
                      </button>
                      {selectedUserIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="text-red-500 hover:underline"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                  )}

                  {/* Selected User Chips */}
                  {selectedUserObjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200/80">
                      {selectedUserObjects.map(user => (
                        <span
                          key={user.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-[11px] font-bold text-slate-800 shadow-2xs"
                        >
                          <span className="w-4 h-4 rounded-full bg-brand-orange text-white text-[9px] flex items-center justify-center uppercase">
                            {user.name?.[0] || 'U'}
                          </span>
                          <span className="truncate max-w-[120px]">{user.name || user.email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveChip(user.id)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Scrollable User List */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 p-2">
                    {loadingUsers ? (
                      <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                        <span>Loading user directory...</span>
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-medium">
                        No players matched your search.
                      </div>
                    ) : (
                      filteredUsers.map(user => {
                        const isSelected = selectedUserIds.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            onClick={() => toggleUserSelection(user.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected ? 'bg-orange-50/70 border border-orange-200' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                                {user.name?.[0] || 'P'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {user.name} {user.inGameName && <span className="text-brand-orange font-mono text-[11px]">({user.inGameName})</span>}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium truncate">
                                  {user.email} • UID: {user.freeFireUid || 'N/A'} • {user.accountNumber || user.id.slice(-6)}
                                </div>
                              </div>
                            </div>

                            <div className="flex-shrink-0 ml-2">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-md bg-brand-orange text-white flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-md border border-slate-300" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tournament Selector (Tournament Mode) */}
              {audienceMode === 'TOURNAMENT' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Select Tournament</span>
                  </label>
                  <select
                    value={selectedTournamentId}
                    onChange={(e) => setSelectedTournamentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-orange"
                  >
                    {availableTournaments.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.registeredCount || 0} registered players • {t.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notification Category / Type */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase text-slate-600 tracking-wider">
                  2. Alert Category & Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'GENERAL', label: '📢 Announcement', color: 'bg-slate-100 text-slate-800' },
                    { id: 'ROOM_ID', label: '🎮 Room ID & Pass', color: 'bg-purple-100 text-purple-800' },
                    { id: 'PAYOUT', label: '💰 Prize Money', color: 'bg-emerald-100 text-emerald-800' },
                    { id: 'WARNING', label: '⚠️ Anti-Cheat Warning', color: 'bg-red-100 text-red-800' },
                    { id: 'MATCH', label: '🏆 Match Callout', color: 'bg-blue-100 text-blue-800' },
                    { id: 'REWARD', label: '🎁 Gift & Reward', color: 'bg-amber-100 text-amber-800' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as NotificationCategory)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        selectedCategory === cat.id
                          ? 'border-brand-orange bg-orange-500 text-white shadow-xs scale-102'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Notification Title *</label>
                  <span className="text-[10px] text-slate-400 font-mono">{title.length}/100</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. 🔥 Match Room ID & Password Ready"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-brand-orange transition-all"
                />
              </div>

              {/* Notification Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Message Body *</label>
                  <span className="text-[10px] text-slate-400 font-mono">{message.length}/500</span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={500}
                  placeholder="Enter complete notification message for the players..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-brand-orange transition-all"
                />
              </div>

              {/* Optional Action URL Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Action Link / Route (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. /tournaments, /wallet, or /live"
                  value={actionLink}
                  onChange={(e) => setActionLink(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-brand-orange transition-all"
                />
              </div>

              {/* Submit Dispatch Button */}
              <button
                type="submit"
                disabled={isSending || !title.trim() || !message.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-red via-brand-orange to-orange-500 hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching Notification...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {audienceMode === 'ALL'
                        ? `Broadcast to All ${availableUsers.length} Players`
                        : audienceMode === 'SINGLE'
                        ? 'Send Direct Notification to Selected Player'
                        : audienceMode === 'MULTIPLE'
                        ? `Send to ${selectedUserIds.length} Selected Players`
                        : 'Send to Tournament Players'}
                    </span>
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Right Column: Live Mockup Preview & Quick Guide (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Preview Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                <Eye className="w-4 h-4 text-brand-orange" />
                <span>Player In-App Preview</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Live Mockup
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md relative overflow-hidden space-y-3">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 text-brand-orange flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Blackrock Alert</div>
                    <div className="text-xs font-black text-white line-clamp-1">
                      {title.trim() || 'Notification Title Preview'}
                    </div>
                  </div>
                </div>
                {getCategoryBadge(selectedCategory)}
              </div>

              <div className="text-xs text-slate-300 leading-relaxed font-medium">
                {message.trim() || 'Your alert message body will appear right here inside player navbar notifications.'}
              </div>

              {actionLink && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-brand-orange font-bold flex items-center gap-1">
                    <span>Action: {actionLink}</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Tap to open</span>
                </div>
              )}

              <div className="text-[9px] text-slate-500 font-mono pt-1">
                Delivered just now • Blackrock Esports Hub
              </div>
            </div>

            {/* Recipient summary info */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                <span>Audience Summary</span>
              </div>
              <div className="text-[11px] text-slate-600">
                {audienceMode === 'ALL' && `Will be sent to all ${availableUsers.length} registered accounts in the system.`}
                {audienceMode === 'SINGLE' && (selectedUserObjects[0] ? `Direct target: ${selectedUserObjects[0].name} (${selectedUserObjects[0].email})` : 'No player selected yet.')}
                {audienceMode === 'MULTIPLE' && `Direct targets: ${selectedUserIds.length} chosen player accounts.`}
                {audienceMode === 'TOURNAMENT' && `Targeting participants of selected tournament.`}
              </div>
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 space-y-3 shadow-sm">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-orange" />
              <span>Admin Best Practices</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold">•</span>
                <span>For <strong>Room IDs</strong>, send 10-15 minutes prior to match time to give players sufficient time.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold">•</span>
                <span>Use <strong>Single User</strong> mode when communicating private payment or registration issues.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold">•</span>
                <span>You can clone previous notifications below to quickly re-dispatch frequent announcements.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* 5. Notification History Table & Management */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
        
        {/* History Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Sent Notification Logs</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
                {notifications.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Inspect dispatch history, recipient player details, and read statuses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter */}
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="UNREAD">Unread by User</option>
              <option value="READ">Read by User</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-orange w-44 sm:w-56"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          {loadingHistory ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
              <span className="text-xs font-bold">Loading notification records...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-700">No Notification Records Found</div>
              <div className="text-xs">Sent notifications will appear here in chronological order.</div>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Type & Title</th>
                  <th className="py-3 px-3">Message Snippet</th>
                  <th className="py-3 px-3">Target Recipient</th>
                  <th className="py-3 px-3">Sent Time</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredHistory.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Type & Title */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 max-w-[200px] truncate">{notif.title}</div>
                        <div>{getCategoryBadge(notif.type)}</div>
                      </div>
                    </td>

                    {/* Message Snippet */}
                    <td className="py-3 px-3 max-w-[260px]">
                      <div className="line-clamp-2 text-slate-600 text-[11px] leading-snug">
                        {notif.message}
                      </div>
                      {notif.link && (
                        <div className="text-[10px] text-brand-orange font-bold font-mono mt-0.5 truncate">
                          Link: {notif.link}
                        </div>
                      )}
                    </td>

                    {/* Target Recipient */}
                    <td className="py-3 px-3">
                      {notif.user ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-[9px] flex items-center justify-center uppercase font-bold text-slate-700">
                              {notif.user.name?.[0] || 'U'}
                            </span>
                            <span>{notif.user.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                            {notif.user.email || notif.user.inGameName || notif.userId}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-500">
                          <User className="w-3 h-3" /> {notif.userId?.slice(-6)}
                        </span>
                      )}
                    </td>

                    {/* Time */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Just now'}
                    </td>

                    {/* Read Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {notif.isRead ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Read
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Unread
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCloneNotification(notif)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-orange hover:bg-orange-50 transition-colors"
                          title="Clone & Reuse in Composer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(notif.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete Notice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
