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
  Award
} from 'lucide-react';
import { LFGPost } from '@/lib/types';

export default function AdminLFGModerationPage() {
  const [posts, setPosts] = useState<LFGPost[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!confirm('Are you sure you want to delete this recruitment post?')) return;

    try {
      const res = await fetch(`/api/admin/lfg?id=${postId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Post removed.');
        await loadPosts();
      }
    } catch {
      alert('Failed to delete post.');
    }
  };

  const handleResetPlayerStatus = async (userId: string) => {
    if (!confirm('Reset this player status back to AVAILABLE?')) return;

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
              LFG & SQUAD RECRUITMENT MODERATION
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Moderate looking-for-group posts, remove spam, and clear stuck player &quot;Pending&quot; locks.
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

      {/* Posts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-cyan-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <div className="font-bold text-slate-700">No Recruitment Posts</div>
            <div className="text-xs">The recruitment board is currently clear.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4">Author</th>
                  <th className="p-4">Type & Role</th>
                  <th className="p-4">Description / WhatsApp</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Moderator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{post.authorName}</div>
                      <div className="text-xs font-mono text-cyan-600">{post.accountNumber || 'BRE-XXXXXX'}</div>
                      <div className="text-[10px] text-slate-400">ID: {post.userId}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-xs text-slate-800">
                        {post.type === 'PLAYER_LOOKING_FOR_SQUAD' ? 'Player (Solo)' : `Squad [${post.squadName || 'Clan'}]`}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-700">
                          {post.roleNeeded}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px] text-slate-500">
                          {post.gameMode}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 max-w-sm">
                      <div className="text-xs text-slate-700 italic leading-snug">
                        &quot;{post.description}&quot;
                      </div>
                      {post.contactWhatsApp && (
                        <div className="text-[11px] font-mono text-green-600 font-bold mt-1 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{post.contactWhatsApp}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                        post.status === 'OPEN' ? 'bg-green-50 text-green-700 border border-green-200' :
                        post.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResetPlayerStatus(post.userId)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center space-x-1"
                          title="Reset Player Status to AVAILABLE"
                        >
                          <RotateCcw className="w-3 h-3 text-cyan-600" />
                          <span>Reset Lock</span>
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                          title="Remove Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
