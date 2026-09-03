'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trash2, 
  RotateCcw, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  MessageCircle, 
  RefreshCw,
  Award,
  Search,
  Filter,
  DollarSign,
  Briefcase,
  Target
} from 'lucide-react';
import { LFGPost, LFGType } from '@/lib/types';

export default function AdminLFGModerationPage() {
  const [posts, setPosts] = useState<LFGPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lfg');
      if (res.ok) {
        const data = await res.json();
        if (data.posts) {
          setPosts(data.posts);
        }
      }
    } catch (err) {
      console.warn('Failed to load LFG posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this community / recruitment post?')) return;

    try {
      const res = await fetch(`/api/admin/lfg?id=${postId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Post removed successfully from database.');
        await loadPosts();
      }
    } catch {
      alert('Failed to delete post.');
    }
  };

  const handleResetPlayerStatus = async (userId: string) => {
    if (!confirm('Reset this player status back to AVAILABLE in database?')) return;

    try {
      const res = await fetch('/api/admin/lfg', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_PLAYER_STATUS', userId }),
      });

      if (res.ok) {
        alert('Player status reset to AVAILABLE!');
      }
    } catch {
      alert('Failed to reset player status.');
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesType = selectedType === 'ALL' || post.type === selectedType;
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      post.authorName?.toLowerCase().includes(q) ||
      post.description?.toLowerCase().includes(q) ||
      post.squadName?.toLowerCase().includes(q) ||
      post.userId?.toLowerCase().includes(q) ||
      post.accountNumber?.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const getBadge = (type: string) => {
    switch (type) {
      case 'PLAYER_LOOKING_FOR_SQUAD':
        return { label: 'Player (Free Agent)', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'SQUAD_LOOKING_FOR_PLAYER':
        return { label: 'Squad Recruitment', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'NEED_MANAGER':
        return { label: 'Need Manager', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'NEED_SPONSOR':
        return { label: 'Need Sponsor', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'NEED_COACH':
        return { label: 'Need Coach', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: type, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              COMMUNITY & RECRUITMENT MODERATION
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Control community posts, clan recruitment, player requests, manager & sponsor needs, and remove spam.
            </p>
          </div>
        </div>

        <button
          onClick={loadPosts}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH POSTS</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search author, clan, phone, bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-orange font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-orange w-full md:w-auto"
          >
            <option value="ALL">All Post Categories</option>
            <option value="PLAYER_LOOKING_FOR_SQUAD">Player Looking for Squad</option>
            <option value="SQUAD_LOOKING_FOR_PLAYER">Squad Recruiting Players</option>
            <option value="NEED_MANAGER">Manager Requests / Offers</option>
            <option value="NEED_SPONSOR">Sponsor / Investor Requests</option>
            <option value="NEED_COACH">Coach / Analyst Requests</option>
          </select>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-cyan-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-slate-600 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <div className="font-bold text-slate-900 text-base">No Recruitment / Community Posts Found</div>
            <div className="text-xs font-medium">All community posts are clean and up to date.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-4">Author / Clan</th>
                  <th className="p-4">Category & Role</th>
                  <th className="p-4">Bio / WhatsApp</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Moderator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => {
                  const badge = getBadge(post.type);
                  return (
                    <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{post.authorName}</div>
                        {post.squadName && (
                          <div className="text-xs font-bold text-orange-600">[{post.squadName}]</div>
                        )}
                        <div className="text-[10px] font-mono text-slate-600 font-bold">Account: {post.accountNumber || 'N/A'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                            {post.roleNeeded}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-[10px] text-slate-500">
                            {post.gameMode?.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 max-w-sm">
                        <div className="text-xs text-slate-700 italic leading-snug line-clamp-2">
                          &quot;{post.description}&quot;
                        </div>
                        <div className="text-[11px] font-mono text-brand-orange font-bold mt-1 flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Internal Inbox User</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          post.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          post.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {post.userId && (
                            <button
                              onClick={() => handleResetPlayerStatus(post.userId)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center space-x-1"
                              title="Reset Player Status to AVAILABLE"
                            >
                              <RotateCcw className="w-3 h-3 text-cyan-600" />
                              <span>Reset Lock</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            title="Delete Post from Database"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
