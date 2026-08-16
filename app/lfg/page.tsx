'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Search, 
  PlusCircle, 
  Flame, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  Award,
  Loader2,
  Crosshair,
  Zap,
  Target
} from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { db } from '@/lib/db';
import { LFGPost, LFGType, User } from '@/lib/types';

export default function LFGPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<LFGType>('PLAYER_LOOKING_FOR_SQUAD');
  const [posts, setPosts] = useState<LFGPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Create Post Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postType, setPostType] = useState<LFGType>('PLAYER_LOOKING_FOR_SQUAD');
  const [gameMode, setGameMode] = useState('BR_SQUAD');
  const [roleNeeded, setRoleNeeded] = useState('RUSHER');
  const [squadName, setSquadName] = useState('');
  const [contactWhatsApp, setContactWhatsApp] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = async () => {
    try {
      const res = await fetch(`/api/lfg?type=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        if (data.posts) {
          setPosts(data.posts);
          return;
        }
      }
    } catch (err) {
      console.warn('LFG load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cur = db.getCurrentUser();
    setCurrentUser(cur);
    loadPosts();
  }, [activeTab]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please sign in to publish a recruitment post.');
      return;
    }
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/lfg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          authorName: currentUser.name,
          type: postType,
          gameMode,
          roleNeeded,
          contactWhatsApp,
          description,
          squadName: postType === 'SQUAD_LOOKING_FOR_PLAYER' ? squadName : undefined,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setDescription('');
        setContactWhatsApp('');
        setSquadName('');
        await loadPosts();
        alert('Recruitment post published to Blackrock Arena!');
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to post.');
      }
    } catch {
      alert('Failed to publish post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinSquad = async (postId: string) => {
    if (!currentUser) {
      alert('Please log in first.');
      return;
    }

    try {
      const res = await fetch('/api/lfg', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          action: 'CONFIRM_SQUAD',
          candidateUserId: currentUser.id,
        }),
      });

      if (res.ok) {
        alert('Squad confirmed! Your player status is now locked to PENDING for the match.');
        await loadPosts();
      }
    } catch {
      alert('Failed to join squad.');
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesSearch = 
      p.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.squadName && p.squadName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.accountNumber && p.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = selectedRole === 'ALL' || p.roleNeeded === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body pb-20 lg:pb-0">
      <Navbar />

      {/* Hero Banner */}
      <div className="bg-surface/60 border-b border-surface-border py-12 relative overflow-hidden text-center">
        <div className="absolute -top-20 left-1/3 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span className="text-xs font-bold text-brand-orange uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2">
            <Crosshair className="w-4 h-4 text-brand-orange" />
            <span>Blackrock Esports Recruitment Portal</span>
          </span>
          <h1 className="font-heading font-black text-4xl sm:text-5xl text-white">
            PLAYER & SQUAD FINDER
          </h1>
          <p className="text-gray-400 text-sm mt-2 max-w-xl mx-auto">
            Find pro teammates, recruit aggressive rushers and snipers, or join an active tournament squad with guaranteed win rates.
          </p>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-sm shadow-neon-red hover:scale-105 transition-all flex items-center space-x-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>POST RECRUITMENT REQUEST</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        
        {/* Toggle & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 bg-surface-light p-1.5 rounded-2xl border border-surface-border w-full md:w-auto">
            <button
              onClick={() => setActiveTab('PLAYER_LOOKING_FOR_SQUAD')}
              className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'PLAYER_LOOKING_FOR_SQUAD'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-neon-red'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Free Agents (Solo Players)</span>
            </button>
            <button
              onClick={() => setActiveTab('SQUAD_LOOKING_FOR_PLAYER')}
              className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'SQUAD_LOOKING_FOR_PLAYER'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-neon-red'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Clans & Squads Recruiting</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-surface-light border border-surface-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-orange font-bold"
            >
              <option value="ALL">All Roles</option>
              <option value="RUSHER">Rusher / Fragger</option>
              <option value="SNIPER">Sniper Marksman</option>
              <option value="IGL">IGL / Captain</option>
              <option value="SUPPORT">Support / Flanker</option>
            </select>

            {/* Search Box */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search player, clan, BRE-ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-light border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>
        </div>

        {/* LFG Posts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-brand-orange">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-surface-border max-w-md mx-auto space-y-3">
            <Users className="w-12 h-12 text-gray-500 mx-auto" />
            <h3 className="font-heading font-black text-xl text-white">No Active Recruitment Posts</h3>
            <p className="text-xs text-gray-400">Be the first player or clan to post a recruitment ad in the arena!</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-brand-orange text-white font-bold text-xs"
            >
              Create Post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="glass-card rounded-3xl p-6 border border-surface-border hover:border-brand-orange/40 transition-all shadow-cyber flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={post.avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'}
                        alt={post.authorName}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-brand-orange/40 shadow-sm"
                      />
                      <div>
                        <div className="font-heading font-black text-base text-white flex items-center gap-1.5">
                          <span>{post.authorName}</span>
                          {post.squadName && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-red/20 text-brand-red font-mono font-bold">
                              [{post.squadName}]
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-brand-cyan font-bold">
                          {post.accountNumber || 'BRE-001928'}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase ${
                      post.status === 'OPEN' ? 'bg-green-900/30 text-green-400 border border-green-500/30' :
                      post.status === 'PENDING' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {post.status}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 my-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                      {post.roleNeeded}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-gray-300">
                      {post.gameMode.replace('_', ' ')}
                    </span>
                    {post.winRate ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-brand-gold/10 text-brand-gold border border-brand-gold/20 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {post.winRate}% Win Rate
                      </span>
                    ) : null}
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 text-xs leading-relaxed line-clamp-3 mt-2 bg-surface-light/40 p-3 rounded-2xl border border-surface-border/50">
                    &quot;{post.description}&quot;
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                  {post.contactWhatsApp ? (
                    <a
                      href={`https://wa.me/${post.contactWhatsApp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 px-3 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 font-bold text-xs transition-all flex items-center justify-center space-x-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  ) : null}

                  {activeTab === 'SQUAD_LOOKING_FOR_PLAYER' && post.status === 'OPEN' && (
                    <button
                      onClick={() => handleJoinSquad(post.id)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-heading font-black text-xs shadow-neon-red hover:brightness-110 transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>JOIN SQUAD</span>
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Create Recruitment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-surface-border space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-2xl text-white flex items-center gap-2">
                <Target className="w-6 h-6 text-brand-orange" />
                <span>POST RECRUITMENT</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-300 block mb-1">Post Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPostType('PLAYER_LOOKING_FOR_SQUAD')}
                    className={`p-3 rounded-xl font-bold border text-center transition-all ${
                      postType === 'PLAYER_LOOKING_FOR_SQUAD' ? 'bg-brand-red text-white border-brand-red' : 'bg-surface-light text-gray-400'
                    }`}
                  >
                    I am a Player Looking for Squad
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType('SQUAD_LOOKING_FOR_PLAYER')}
                    className={`p-3 rounded-xl font-bold border text-center transition-all ${
                      postType === 'SQUAD_LOOKING_FOR_PLAYER' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-surface-light text-gray-400'
                    }`}
                  >
                    We are a Squad Looking for Player
                  </button>
                </div>
              </div>

              {postType === 'SQUAD_LOOKING_FOR_PLAYER' && (
                <div>
                  <label className="font-bold text-gray-300 block mb-1">Clan / Squad Name</label>
                  <input
                    type="text"
                    value={squadName}
                    onChange={(e) => setSquadName(e.target.value)}
                    required
                    placeholder="e.g. BRK_TITANS"
                    className="w-full bg-surface-light border border-surface-border rounded-xl px-4 py-2.5 text-white font-bold"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-300 block mb-1">Game Mode</label>
                  <select
                    value={gameMode}
                    onChange={(e) => setGameMode(e.target.value)}
                    className="w-full bg-surface-light border border-surface-border rounded-xl px-3 py-2.5 text-white font-bold"
                  >
                    <option value="BR_SQUAD">BR Ranked Squad</option>
                    <option value="CS_4V4">Clash Squad 4v4</option>
                    <option value="DUO">BR Duo</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-300 block mb-1">Role Needed / Offered</label>
                  <select
                    value={roleNeeded}
                    onChange={(e) => setRoleNeeded(e.target.value)}
                    className="w-full bg-surface-light border border-surface-border rounded-xl px-3 py-2.5 text-white font-bold"
                  >
                    <option value="RUSHER">Rusher / Fragger</option>
                    <option value="SNIPER">Sniper Marksman</option>
                    <option value="IGL">IGL Captain</option>
                    <option value="SUPPORT">Support / Flanker</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-300 block mb-1">WhatsApp Contact Number (Optional)</label>
                <input
                  type="text"
                  value={contactWhatsApp}
                  onChange={(e) => setContactWhatsApp(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full bg-surface-light border border-surface-border rounded-xl px-4 py-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-300 block mb-1">Requirements / Player Bio *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="e.g. KD 4+, Level 60+, Mic ON, Active in evening tournaments..."
                  className="w-full bg-surface-light border border-surface-border rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-surface-light text-gray-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-red to-brand-orange text-white font-bold flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>PUBLISH RECRUITMENT</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
