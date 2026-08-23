'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Briefcase, 
  DollarSign, 
  Target, 
  PlusCircle, 
  Megaphone, 
  Pin, 
  MessageCircle, 
  Search, 
  Flame, 
  Award, 
  Loader2, 
  CheckCircle2, 
  Filter, 
  Sparkles,
  Phone,
  Zap,
  X
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { LFGPost, LFGType, Announcement, User } from '@/lib/types';

type CommunityTab = 'ALL' | 'ANNOUNCEMENTS' | LFGType;

export default function CommunityPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<CommunityTab>('ALL');
  const [posts, setPosts] = useState<LFGPost[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Post Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postType, setPostType] = useState<LFGType>('PLAYER_LOOKING_FOR_SQUAD');
  const [titleOrSquad, setTitleOrSquad] = useState('');
  const [roleOrRequirement, setRoleOrRequirement] = useState('RUSHER');
  const [gameMode, setGameMode] = useState('BR_SQUAD');
  const [contactWhatsApp, setContactWhatsApp] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [lfgRes, annRes] = await Promise.all([
        fetch('/api/lfg'),
        fetch('/api/announcements')
      ]);

      if (lfgRes.ok) {
        const lfgData = await lfgRes.json();
        setPosts(lfgData.posts || []);
      }

      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.announcements || []);
      }
    } catch (err) {
      console.warn('Community load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cur = db.getCurrentUser();
    setCurrentUser(cur);
    loadData();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      const userId = currentUser?.id || `guest_${Date.now()}`;
      const authorName = currentUser?.name || titleOrSquad || 'Free Fire Warrior';

      const res = await fetch('/api/lfg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          authorName,
          type: postType,
          gameMode,
          roleNeeded: roleOrRequirement,
          contactWhatsApp,
          description,
          squadName: titleOrSquad.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setDescription('');
        setContactWhatsApp('');
        setTitleOrSquad('');
        setSuccessMsg('Your community post has been published successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
        await loadData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to publish post.');
      }
    } catch (err) {
      console.error('Post error:', err);
      alert('Network error while publishing post.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter posts & announcements
  const filteredPosts = posts.filter((p) => {
    const matchesTab = activeTab === 'ALL' || p.type === activeTab;
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      p.authorName?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.squadName?.toLowerCase().includes(query) ||
      p.roleNeeded?.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  const filteredAnnouncements = announcements.filter((a) => {
    const matchesTab = activeTab === 'ALL' || activeTab === 'ANNOUNCEMENTS';
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      a.title?.toLowerCase().includes(query) ||
      a.content?.toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  const getPostTypeBadge = (type: LFGType) => {
    switch (type) {
      case 'PLAYER_LOOKING_FOR_SQUAD':
        return { label: '👤 Free Agent Player', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SQUAD_LOOKING_FOR_PLAYER':
        return { label: '🛡️ Squad Recruiting', bg: 'bg-orange-50 text-brand-orange border-orange-200' };
      case 'NEED_MANAGER':
        return { label: '👔 Manager Needed', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'NEED_SPONSOR':
        return { label: '💎 Sponsor / Investor Needed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'NEED_COACH':
        return { label: '🎯 Coach / Analyst Needed', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'Community Post', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body pb-20 lg:pb-0">
      <Navbar />

      {/* 1. Header Banner */}
      <div className="bg-white border-b border-slate-200 py-12 sm:py-16 text-center space-y-3 relative overflow-hidden">
        <div className="absolute -top-20 left-1/3 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-2">
          <span className="text-xs font-bold text-brand-orange uppercase tracking-widest inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-brand-orange/20 mb-1">
            <Megaphone className="w-3.5 h-3.5 text-brand-orange" />
            <span>Blackrock Esports Community & Recruitment Hub</span>
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
            COMMUNITY & RECRUITMENT
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-xl mx-auto leading-relaxed">
            Find competitive squads, recruit fraggers & snipers, find team managers, request tournament sponsors, and read official announcements.
          </p>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs sm:text-sm shadow-xs hover:scale-105 transition-all flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>POST RECRUITMENT / COMMUNITY AD</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {successMsg && (
          <div className="p-4 rounded-[16px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-semibold flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2. Filter Tabs & Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search players, clans, managers, sponsors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
            {[
              { id: 'ALL', label: '🔥 All Community Posts' },
              { id: 'ANNOUNCEMENTS', label: '📢 Official Announcements' },
              { id: 'PLAYER_LOOKING_FOR_SQUAD', label: '👤 Free Agent Players' },
              { id: 'SQUAD_LOOKING_FOR_PLAYER', label: '🛡️ Squads Recruiting' },
              { id: 'NEED_MANAGER', label: '👔 Team Managers' },
              { id: 'NEED_SPONSOR', label: '💎 Sponsors & Investors' },
              { id: 'NEED_COACH', label: '🎯 Coaches & Analysts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Community Content Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#2563EB]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredPosts.length === 0 && filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3 max-w-md mx-auto">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-heading font-black text-xl text-slate-900">No Posts in this Category</h3>
            <p className="text-xs text-slate-600 font-medium">Be the first to post your player form, clan recruitment, or manager/sponsor request!</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-xs"
            >
              Post Now
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Announcements Section */}
            {filteredAnnouncements.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-brand-red" />
                  <span>Official Announcements</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAnnouncements.map((ann) => (
                    <div key={ann.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-2 relative">
                      {ann.isPinned && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 uppercase px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 mb-1">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      <h3 className="font-bold text-base text-slate-900">{ann.title}</h3>
                      <p className="text-slate-600 text-xs leading-relaxed">{ann.content}</p>
                      <div className="text-[10px] text-slate-500 font-mono pt-1">
                        {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Official'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recruitment / Community Posts Grid */}
            {filteredPosts.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand-orange" />
                  <span>Community Recruitment & Offers</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPosts.map((post) => {
                    const badge = getPostTypeBadge(post.type);
                    return (
                      <div
                        key={post.id}
                        className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-brand-orange/40 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
                      >
                        <div>
                          {/* Post Header */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center space-x-3">
                              <img
                                src={post.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'}
                                alt={post.authorName}
                                className="w-11 h-11 rounded-2xl object-cover border border-slate-200"
                              />
                              <div>
                                <div className="font-heading font-black text-sm text-slate-900 flex items-center gap-1.5">
                                  <span>{post.authorName}</span>
                                  {post.squadName && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-orange-50 text-brand-orange border border-orange-200 font-mono font-bold">
                                      [{post.squadName}]
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 font-semibold">
                                  {post.accountNumber || 'EZBD-MEMBER'}
                                </div>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1.5 my-2.5">
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              Role: {post.roleNeeded}
                            </span>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {post.gameMode.replace('_', ' ')}
                            </span>
                            {post.winRate ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                {post.winRate}% Win Rate
                              </span>
                            ) : null}
                          </div>

                          {/* Description */}
                          <p className="text-slate-600 text-xs leading-relaxed line-clamp-3 mt-2 bg-[#F8FAFC] p-3 rounded-2xl border border-slate-100">
                            &quot;{post.description}&quot;
                          </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          {post.contactWhatsApp ? (
                            <a
                              href={`https://wa.me/${post.contactWhatsApp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition-all flex items-center justify-center space-x-1.5 shadow-2xs"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Contact WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No contact specified</span>
                          )}

                          {post.type === 'SQUAD_LOOKING_FOR_PLAYER' && post.status === 'OPEN' && (
                            <span className="px-3 py-1.5 rounded-xl bg-orange-50 text-brand-orange border border-orange-200 text-xs font-bold">
                              Slot Open
                            </span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* 4. Create Recruitment / Form Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-black text-xl text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-orange" />
                <span>Create Community & Recruitment Post</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs font-medium">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Select Post Category *</label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as LFGType)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                >
                  <option value="PLAYER_LOOKING_FOR_SQUAD">👤 Player Profile (Looking for Squad/Team)</option>
                  <option value="SQUAD_LOOKING_FOR_PLAYER">🛡️ Squad/Clan Recruiting (Looking for Players)</option>
                  <option value="NEED_MANAGER">👔 Team Manager Request / Staff Offer</option>
                  <option value="NEED_SPONSOR">💎 Team Sponsor / Tournament Investor Request</option>
                  <option value="NEED_COACH">🎯 Coach / Analyst Request</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {postType === 'PLAYER_LOOKING_FOR_SQUAD' ? 'Player In-Game Name (IGN)' : 'Squad / Organization / Clan Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={titleOrSquad}
                  onChange={(e) => setTitleOrSquad(e.target.value)}
                  placeholder={postType === 'PLAYER_LOOKING_FOR_SQUAD' ? 'e.g. VORTEX_PRO' : 'e.g. TITAN_ESPORTS'}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Game Mode</label>
                  <select
                    value={gameMode}
                    onChange={(e) => setGameMode(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                  >
                    <option value="BR_SQUAD">BR Ranked Squad</option>
                    <option value="CS_4V4">Clash Squad 4v4</option>
                    <option value="CUSTOM_SCRIMS">Custom Daily Scrims</option>
                    <option value="DUO">BR Duo</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role / Requirement</label>
                  <select
                    value={roleOrRequirement}
                    onChange={(e) => setRoleOrRequirement(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-brand-orange"
                  >
                    <option value="RUSHER">Rusher / Entry Fragger</option>
                    <option value="SNIPER">Sniper Marksman</option>
                    <option value="IGL">IGL / Captain</option>
                    <option value="SUPPORT">Support / Flanker</option>
                    <option value="TEAM_MANAGER">Team Manager</option>
                    <option value="TOURNAMENT_SPONSOR">Tournament / Jersey Sponsor</option>
                    <option value="HEAD_COACH">Coach / Strategy Analyst</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">WhatsApp Contact Number *</label>
                <input
                  type="text"
                  required
                  value={contactWhatsApp}
                  onChange={(e) => setContactWhatsApp(e.target.value)}
                  placeholder="e.g. 017XXXXXXXX or +88017XXXXXXXX"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Detailed Description & Requirements *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Level 65+, KD 4.5+, Active daily 8PM-11PM, or Sponsor details with proposed terms..."
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold flex items-center justify-center space-x-1 disabled:opacity-50 shadow-xs"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>PUBLISH TO COMMUNITY</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
