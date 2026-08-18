'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { 
  Megaphone, 
  Pin, 
  Search, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw,
  Loader2,
  CheckCircle2,
  Tag,
  Share2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Announcement } from '@/lib/types';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'GENERAL' | 'UPDATE' | 'TOURNAMENT'>('ALL');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/announcements', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.warn('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch = 
      ann.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || ann.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const pinnedAnnouncements = filteredAnnouncements.filter((ann) => ann.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter((ann) => !ann.isPinned);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body pb-24 lg:pb-0">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200 py-12 sm:py-16 text-center space-y-3 relative overflow-hidden">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <span className="text-xs font-bold text-red-600 uppercase tracking-widest inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-full bg-red-50 border border-red-200 mb-1">
          <Megaphone className="w-3.5 h-3.5 text-red-600 animate-bounce" />
          <span>Official Public Notice Feed</span>
        </span>

        <h1 className="font-heading font-black text-2xl sm:text-4xl md:text-5xl text-slate-900 tracking-tight break-words px-2">
          OFFICIAL ANNOUNCEMENTS
        </h1>

        <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto px-4">
          Tournament notices, server updates, rule changes, and executive news from BlackRock Esports.
        </p>

        {/* Search & Category Filter Bar */}
        <div className="max-w-xl mx-auto px-4 pt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notices, rules, updates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange shadow-xs"
            />
          </div>

          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {(['ALL', 'TOURNAMENT', 'UPDATE', 'GENERAL'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat === 'ALL' ? 'All Notices' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
            <span className="text-xs font-semibold">Loading official notices...</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3 shadow-xs">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No Announcements Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no announcements matching your search criteria at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. Pinned High Priority Announcements */}
            {pinnedAnnouncements.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-red-600 tracking-wider px-1">
                  <Pin className="w-4 h-4 text-red-600 fill-red-600" />
                  <span>PINNED NOTICES</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {pinnedAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      onClick={() => setSelectedAnnouncement(ann)}
                      className="bg-gradient-to-r from-red-500/5 via-amber-500/5 to-white rounded-3xl p-5 sm:p-7 border-2 border-red-200 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 relative overflow-hidden group"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-red-200">
                            <Pin className="w-3 h-3 fill-red-700" /> Pinned
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                            {ann.category}
                          </span>
                        </div>

                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h2 className="font-heading font-black text-lg sm:text-xl text-slate-900 group-hover:text-red-600 transition-colors">
                        {ann.title}
                      </h2>

                      <p className="text-xs sm:text-sm text-slate-600 font-medium line-clamp-3 leading-relaxed whitespace-pre-line">
                        {ann.content}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[11px] font-bold text-red-600 group-hover:underline flex items-center gap-1">
                          <span>Read Full Announcement</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>

                        <span className="text-[11px] text-slate-400 font-semibold">Official Admin Post</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Regular Announcements Feed */}
            {regularAnnouncements.length > 0 && (
              <div className="space-y-3">
                {pinnedAnnouncements.length > 0 && (
                  <div className="text-xs font-black uppercase text-slate-500 tracking-wider px-1 pt-4">
                    RECENT UPDATES
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {regularAnnouncements.map((ann) => (
                    <div
                      key={ann.id}
                      onClick={() => setSelectedAnnouncement(ann)}
                      className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            ann.category === 'TOURNAMENT' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            ann.category === 'UPDATE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {ann.category}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(ann.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="font-heading font-bold text-base text-slate-900 group-hover:text-brand-orange transition-colors">
                          {ann.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                          {ann.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                        <span className="text-[11px] font-bold text-brand-orange flex items-center gap-1 group-hover:underline">
                          <span>View Notice</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">BlackRock Team</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ── Notice Detail Modal ── */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {selectedAnnouncement.isPinned && (
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px] uppercase">
                    Pinned
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                  {selectedAnnouncement.category}
                </span>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {new Date(selectedAnnouncement.createdAt).toLocaleString()}
              </span>
            </div>

            <h2 className="font-heading font-black text-xl text-slate-900 leading-tight">
              {selectedAnnouncement.title}
            </h2>

            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
              {selectedAnnouncement.content}
            </div>

            <button
              onClick={() => setSelectedAnnouncement(null)}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs"
            >
              Close Notice
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
