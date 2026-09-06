'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Squad, SquadMember } from '@/lib/types';
import { 
  ShieldCheck, 
  Users, 
  Search, 
  Loader2, 
  Trash2, 
  Edit3, 
  Crown, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert,
  Zap,
  Eye,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  X,
  RefreshCw,
  Trophy,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  Gamepad2,
  Flame,
  Swords
} from 'lucide-react';
import Link from 'next/link';
import SquadLogoUploader from '@/components/ui/SquadLogoUploader';

type SortOption = 
  | 'MEMBERS_DESC'
  | 'MEMBERS_ASC'
  | 'WINS_DESC'
  | 'MATCHES_DESC'
  | 'WIN_RATE_DESC'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'NEWEST'
  | 'OLDEST';

type FilterTabOption = 
  | 'ALL'
  | 'FULL_SQUAD'
  | 'DUO_TRIO'
  | 'SOLO'
  | 'WINNERS'
  | 'ACTIVE_COMBAT'
  | 'ZERO_MEMBERS';

export default function AdminSquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [stats, setStats] = useState<any>({ totalSquads: 0, totalMembers: 0 });
  const [loading, setLoading] = useState(true);
  
  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTabOption>('ALL');
  const [gameFilter, setGameFilter] = useState('ALL');
  const [rosterSizeFilter, setRosterSizeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('MEMBERS_DESC');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Roster Modal
  const [viewingSquad, setViewingSquad] = useState<Squad | null>(null);

  // Edit/Moderate Modal
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadAdminSquads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/squads', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSquads(data.squads || []);
        setStats(data.stats || { totalSquads: 0, totalMembers: 0 });
      }
    } catch (err) {
      console.warn('Failed to load squads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminSquads();
  }, []);

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDisbandSquad = async (squad: Squad) => {
    if (!confirm(`ADMIN ACTION: Are you sure you want to permanently disband [${squad.tag}] ${squad.name}?`)) return;

    try {
      const res = await fetch('/api/admin/squads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squadId: squad.id,
          action: 'DISBAND',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        loadAdminSquads();
      } else {
        alert(data.message || 'Failed to disband squad.');
      }
    } catch {
      alert('Error disbanding squad.');
    }
  };

  const handleSaveModerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSquad) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/squads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squadId: editingSquad.id,
          name: editName.trim(),
          tag: editTag.trim().toUpperCase(),
          logoUrl: editLogo,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Squad updated successfully!');
        setEditingSquad(null);
        loadAdminSquads();
      } else {
        alert(data.message || 'Failed to update squad.');
      }
    } catch {
      alert('Error updating squad.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── COUNTS FOR QUICK TABS ──────────────────────────────────
  const counts = useMemo(() => {
    let fullSquad = 0;
    let duoTrio = 0;
    let solo = 0;
    let winners = 0;
    let activeCombat = 0;
    let zeroMembers = 0;
    let totalCombatWins = 0;
    let totalCombatMatches = 0;

    for (const s of squads) {
      const activeCount = (s.members || []).filter(m => m.status === 'ACTIVE').length;
      if (activeCount >= 4) fullSquad++;
      else if (activeCount === 2 || activeCount === 3) duoTrio++;
      else if (activeCount === 1) solo++;
      else if (activeCount === 0) zeroMembers++;

      if ((s.matchesWon || 0) > 0) winners++;
      if ((s.matchesPlayed || 0) >= 5) activeCombat++;

      totalCombatWins += (s.matchesWon || 0);
      totalCombatMatches += (s.matchesPlayed || 0);
    }

    return {
      fullSquad,
      duoTrio,
      solo,
      winners,
      activeCombat,
      zeroMembers,
      totalCombatWins,
      totalCombatMatches,
    };
  }, [squads]);

  // ─── FILTER & SORT LOGIC ────────────────────────────────────
  const filteredSquads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const result = squads.filter((s) => {
      // 1. Search Query
      if (q) {
        const matchesSquad = 
          (s.name || '').toLowerCase().includes(q) ||
          (s.tag || '').toLowerCase().includes(q) ||
          (s.id || '').toLowerCase().includes(q) ||
          (s.leaderName || '').toLowerCase().includes(q) ||
          (s.leaderId || '').toLowerCase().includes(q);

        const matchesMember = (s.members || []).some((m) =>
          (m.userName || '').toLowerCase().includes(q) ||
          (m.userId || '').toLowerCase().includes(q) ||
          (m.accountNumber && m.accountNumber.toLowerCase().includes(q)) ||
          (m.freeFireUid && m.freeFireUid.includes(q))
        );

        if (!matchesSquad && !matchesMember) return false;
      }

      // 2. Game Filter
      if (gameFilter !== 'ALL' && s.game !== gameFilter) {
        return false;
      }

      const activeCount = (s.members || []).filter(m => m.status === 'ACTIVE').length;

      // 3. Roster Size Dropdown
      if (rosterSizeFilter === '4+' && activeCount < 4) return false;
      if (rosterSizeFilter === '3' && activeCount !== 3) return false;
      if (rosterSizeFilter === '2' && activeCount !== 2) return false;
      if (rosterSizeFilter === '1' && activeCount !== 1) return false;
      if (rosterSizeFilter === '0' && activeCount !== 0) return false;

      // 4. Quick Filter Tabs
      if (filterTab === 'FULL_SQUAD' && activeCount < 4) return false;
      if (filterTab === 'DUO_TRIO' && (activeCount < 2 || activeCount > 3)) return false;
      if (filterTab === 'SOLO' && activeCount !== 1) return false;
      if (filterTab === 'WINNERS' && (s.matchesWon || 0) <= 0) return false;
      if (filterTab === 'ACTIVE_COMBAT' && (s.matchesPlayed || 0) < 5) return false;
      if (filterTab === 'ZERO_MEMBERS' && activeCount !== 0) return false;

      return true;
    });

    // 5. Sorting
    result.sort((a, b) => {
      const aActive = (a.members || []).filter(m => m.status === 'ACTIVE').length;
      const bActive = (b.members || []).filter(m => m.status === 'ACTIVE').length;

      switch (sortBy) {
        case 'MEMBERS_DESC':
          return bActive - aActive || (b.matchesWon || 0) - (a.matchesWon || 0);
        case 'MEMBERS_ASC':
          return aActive - bActive || (a.matchesWon || 0) - (b.matchesWon || 0);
        case 'WINS_DESC':
          return (b.matchesWon || 0) - (a.matchesWon || 0) || (b.matchesPlayed || 0) - (a.matchesPlayed || 0);
        case 'MATCHES_DESC':
          return (b.matchesPlayed || 0) - (a.matchesPlayed || 0) || (b.matchesWon || 0) - (a.matchesWon || 0);
        case 'WIN_RATE_DESC': {
          const rateA = a.matchesPlayed > 0 ? ((a.matchesWon || 0) / a.matchesPlayed) : 0;
          const rateB = b.matchesPlayed > 0 ? ((b.matchesWon || 0) / b.matchesPlayed) : 0;
          return rateB - rateA || (b.matchesWon || 0) - (a.matchesWon || 0);
        }
        case 'NAME_ASC':
          return (a.name || '').localeCompare(b.name || '');
        case 'NAME_DESC':
          return (b.name || '').localeCompare(a.name || '');
        case 'NEWEST': {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
        case 'OLDEST': {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [squads, searchQuery, gameFilter, rosterSizeFilter, filterTab, sortBy]);

  // ─── PAGINATION ─────────────────────────────────────────────
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredSquads.length / pageSize));

  const paginatedSquads = useMemo(() => {
    if (pageSize === -1) return filteredSquads;
    const start = (currentPage - 1) * pageSize;
    return filteredSquads.slice(start, start + pageSize);
  }, [filteredSquads, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, gameFilter, rosterSizeFilter, filterTab, sortBy, pageSize]);

  // ─── RESET FILTERS ──────────────────────────────────────────
  const isAnyFilterActive =
    Boolean(searchQuery.trim()) ||
    filterTab !== 'ALL' ||
    gameFilter !== 'ALL' ||
    rosterSizeFilter !== 'ALL' ||
    sortBy !== 'MEMBERS_DESC';

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterTab('ALL');
    setGameFilter('ALL');
    setRosterSizeFilter('ALL');
    setSortBy('MEMBERS_DESC');
    setCurrentPage(1);
  };

  const handleToggleSort = (column: 'NAME' | 'MEMBERS' | 'STATS') => {
    if (column === 'NAME') {
      setSortBy((prev) => (prev === 'NAME_ASC' ? 'NAME_DESC' : 'NAME_ASC'));
    } else if (column === 'MEMBERS') {
      setSortBy((prev) => (prev === 'MEMBERS_DESC' ? 'MEMBERS_ASC' : 'MEMBERS_DESC'));
    } else if (column === 'STATS') {
      setSortBy((prev) => (prev === 'WINS_DESC' ? 'MATCHES_DESC' : prev === 'MATCHES_DESC' ? 'WIN_RATE_DESC' : 'WINS_DESC'));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-black text-2xl text-slate-900 tracking-tight">
                Squad & Clan Management
              </h1>
              <span className="flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                OFFICIAL ROSTERS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage user-created esports squads, review official player rosters for dispute resolution, and moderate names or logos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadAdminSquads}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold shadow-xs"
            title="Refresh squads data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-amber-800">Total Squads</div>
            <div className="text-lg font-black text-amber-600">{stats.totalSquads || squads.length}</div>
          </div>
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-blue-800">Active Players</div>
            <div className="text-lg font-black text-blue-600">{stats.totalMembers || 0}</div>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Squads (4+)</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{counts.fullSquad}</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Tournament Ready</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Duo & Trio (2-3)</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{counts.duoTrio}</div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">Growing Clans</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Winning Squads</div>
            <div className="text-xl font-black text-amber-600 mt-0.5">{counts.winners}</div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">{counts.totalCombatWins} Total Wins</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Solo & Incomplete</div>
            <div className="text-xl font-black text-slate-700 mt-0.5">{counts.solo + counts.zeroMembers}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{counts.solo} Solo / {counts.zeroMembers} Empty</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search, Quick Filters & Advanced Sort Toolbar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
        
        {/* Row 1: Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Squad Name, Tag, ID, Leader Name, Member Name, Account No, or Game UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-2xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row 2: Quick Activity Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
          {[
            { key: 'ALL', label: `All Squads (${squads.length})` },
            { key: 'FULL_SQUAD', label: `Full Squads 4+ (${counts.fullSquad}) 🛡️` },
            { key: 'DUO_TRIO', label: `Duo & Trio 2-3 (${counts.duoTrio}) ⚔️` },
            { key: 'SOLO', label: `Solo 1 Player (${counts.solo}) 👤` },
            { key: 'WINNERS', label: `With Wins (${counts.winners}) 🏆` },
            { key: 'ACTIVE_COMBAT', label: `5+ Matches (${counts.activeCombat}) 💥` },
            { key: 'ZERO_MEMBERS', label: `Empty / Inactive (${counts.zeroMembers}) ⚠️` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterTab === tab.key
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Row 3: Advanced Dropdowns & Sort */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-amber-500 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer pr-1"
              >
                <option value="MEMBERS_DESC">👥 Most Members (High → Low)</option>
                <option value="MEMBERS_ASC">👥 Fewest Members (Low → High)</option>
                <option value="WINS_DESC">🏆 Most Wins</option>
                <option value="MATCHES_DESC">⚔️ Most Matches Played</option>
                <option value="WIN_RATE_DESC">📈 Highest Win Rate %</option>
                <option value="NAME_ASC">🔤 Squad Name (A → Z)</option>
                <option value="NAME_DESC">🔤 Squad Name (Z → A)</option>
                <option value="NEWEST">🕒 Recently Created (Newest)</option>
                <option value="OLDEST">⏳ Oldest First</option>
              </select>
            </div>

            {/* Game Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-amber-500 shadow-2xs">
              <Gamepad2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 uppercase">Game:</span>
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer pr-1"
              >
                <option value="ALL">All Games</option>
                <option value="FREE_FIRE">Free Fire</option>
                <option value="PUBG_MOBILE">PUBG Mobile</option>
                <option value="VALORANT">Valorant</option>
                <option value="MLBB">MLBB</option>
                <option value="EFOOTBALL">eFootball</option>
              </select>
            </div>

            {/* Roster Size Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-amber-500 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 uppercase">Size:</span>
              <select
                value={rosterSizeFilter}
                onChange={(e) => setRosterSizeFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer pr-1"
              >
                <option value="ALL">All Sizes</option>
                <option value="4+">Full Squad (4+ Players)</option>
                <option value="3">Trio (3 Players)</option>
                <option value="2">Duo (2 Players)</option>
                <option value="1">Solo (1 Player)</option>
                <option value="0">Empty (0 Players)</option>
              </select>
            </div>

            {/* Reset Filters */}
            {isAnyFilterActive && (
              <button
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 transition-all cursor-pointer shadow-2xs text-xs"
                title="Reset all filters and sorting"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Page Size and Stats Counter */}
          <div className="flex items-center gap-3 ml-auto text-xs font-semibold">
            <div className="flex items-center gap-1 text-slate-500">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All ({filteredSquads.length})</option>
              </select>
            </div>

            <div className="text-slate-500 font-medium whitespace-nowrap">
              Showing <strong className="text-slate-900 font-bold">{paginatedSquads.length}</strong> of <strong className="text-slate-900 font-bold">{filteredSquads.length}</strong>
              {filteredSquads.length !== squads.length && (
                <span className="text-slate-400 text-[11px] ml-1">({squads.length} total)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Squads Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold mt-2">Loading squad records...</p>
          </div>
        ) : filteredSquads.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500 font-medium">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-700 text-sm">No squads match your filters</p>
            <p className="text-slate-400 mt-1">Try resetting or broadening your search terms.</p>
            {isAnyFilterActive && (
              <button
                onClick={resetAllFilters}
                className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[980px] border-collapse">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[12%]" />
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  {/* Column 1: Squad Info */}
                  <th 
                    onClick={() => handleToggleSort('NAME')}
                    className="px-5 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    title="Click to sort by Squad Name"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Squad Info</span>
                      {sortBy === 'NAME_ASC' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-600" />
                      ) : sortBy === 'NAME_DESC' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Column 2: Game */}
                  <th className="px-4 py-3.5">Game</th>

                  {/* Column 3: Leader */}
                  <th className="px-4 py-3.5">Leader</th>

                  {/* Column 4: Active Roster */}
                  <th 
                    onClick={() => handleToggleSort('MEMBERS')}
                    className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    title="Click to sort by Member Count"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Active Roster</span>
                      {sortBy === 'MEMBERS_DESC' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                      ) : sortBy === 'MEMBERS_ASC' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Column 5: Stats */}
                  <th 
                    onClick={() => handleToggleSort('STATS')}
                    className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    title="Click to toggle sort by Wins / Matches / Win Rate"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Stats</span>
                      {sortBy === 'WINS_DESC' || sortBy === 'MATCHES_DESC' || sortBy === 'WIN_RATE_DESC' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Column 6: Actions */}
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSquads.map((squad) => {
                  const activeRoster = (squad.members || []).filter(m => m.status === 'ACTIVE');
                  const winRate = squad.matchesPlayed > 0 
                    ? Math.round(((squad.matchesWon || 0) / squad.matchesPlayed) * 100) 
                    : 0;

                  return (
                    <tr key={squad.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Squad Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img 
                            src={squad.logoUrl || '/logo.png'} 
                            alt={squad.name} 
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100" 
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', '/logo.png');
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-mono text-[10px] font-black border border-amber-200 shrink-0">
                                [{squad.tag}]
                              </span>
                              <span className="font-bold text-slate-900 text-sm truncate" title={squad.name}>
                                {squad.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>ID: {squad.id}</span>
                              <button
                                onClick={() => handleCopyId(squad.id)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                                title="Copy Squad ID"
                              >
                                {copiedId === squad.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Game */}
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                          {squad.game}
                        </span>
                      </td>

                      {/* Leader */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <span className="truncate" title={squad.leaderName}>{squad.leaderName}</span>
                          <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <span className="truncate max-w-[130px]" title={squad.leaderId}>ID: {squad.leaderId}</span>
                          <button
                            onClick={() => handleCopyId(squad.leaderId)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                            title="Copy Leader ID"
                          >
                            {copiedId === squad.leaderId ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Active Roster */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setViewingSquad(squad)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
                            activeRoster.length >= 4 
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' 
                              : activeRoster.length > 0
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                          }`}
                          title="Click to view full roster members"
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>{activeRoster.length} Players</span>
                        </button>
                      </td>

                      {/* Stats */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        <div>Matches: <strong>{squad.matchesPlayed || 0}</strong></div>
                        <div>
                          Wins: <strong className="text-emerald-600">{squad.matchesWon || 0}</strong>
                          {squad.matchesPlayed > 0 && (
                            <span className="text-[10px] text-slate-400 ml-1">({winRate}%)</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingSquad(squad);
                            setEditName(squad.name);
                            setEditTag(squad.tag);
                            setEditLogo(squad.logoUrl);
                          }}
                          className="p-2 text-slate-500 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                          title="Edit / Moderate Squad"
                        >
                          <Edit3 className="w-4 h-4 inline" />
                        </button>

                        <button
                          onClick={() => handleDisbandSquad(squad)}
                          className="p-2 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Disband Squad"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Bar */}
        {!loading && filteredSquads.length > 0 && totalPages > 1 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium">
              Page <strong className="text-slate-900 font-bold">{currentPage}</strong> of <strong className="text-slate-900 font-bold">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;

                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                            currentPage === p
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════ MODAL 1: VIEW ROSTER (DISPUTE RESOLUTION) ════════════ */}
      {viewingSquad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl text-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img 
                  src={viewingSquad.logoUrl || '/logo.png'} 
                  alt={viewingSquad.name} 
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-100" 
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', '/logo.png');
                  }}
                />
                <div>
                  <h3 className="font-heading font-black text-lg text-slate-900">[{viewingSquad.tag}] {viewingSquad.name}</h3>
                  <p className="text-xs text-slate-500">Official Roster & Player Account Records</p>
                </div>
              </div>
              <button
                onClick={() => setViewingSquad(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold cursor-pointer transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {(viewingSquad.members || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No registered members in this squad roster.
                </div>
              ) : (
                (viewingSquad.members || []).map((m) => (
                  <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={m.userAvatar || '/logo.png'} 
                        alt={m.userName} 
                        className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200 shrink-0" 
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', '/logo.png');
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm truncate">{m.userName}</span>
                          {m.isLeader && <span title="Leader">👑</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">Account No: <strong>{m.accountNumber || 'N/A'}</strong></div>
                        {m.freeFireUid && (
                          <div className="text-[11px] text-emerald-700 font-mono">Game UID: <strong>{m.freeFireUid}</strong></div>
                        )}
                      </div>
                    </div>

                    <div className="text-right space-y-1 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase block">
                        {m.inGameRole || 'PLAYER'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold block ${m.status === 'ACTIVE' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-slate-500 bg-slate-100'}`}>
                        ● {m.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingSquad(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MODAL 2: MODERATE SQUAD ════════════ */}
      {editingSquad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-black text-lg text-slate-900">Moderate Squad Info</h3>
              <button 
                onClick={() => setEditingSquad(null)} 
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 cursor-pointer transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModerate} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-700 font-bold uppercase block text-[11px]">Squad Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-bold uppercase block text-[11px]">Squad Tag *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={editTag}
                  onChange={(e) => setEditTag(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-black uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <SquadLogoUploader
                  value={editLogo}
                  onChange={setEditLogo}
                  label="Squad Logo (Upload / Change) *"
                  required={true}
                  squadTag={editTag}
                  squadName={editName}
                  theme="light"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSquad(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
