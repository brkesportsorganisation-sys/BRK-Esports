'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Pin, Megaphone, Bell } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { Announcement } from '@/lib/types';

export default function CommunityPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    setAnnouncements(db.getAnnouncements());
  }, []);

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body">
      <Navbar />

      <div className="bg-surface/60 border-b border-surface-border py-12 text-center">
        <span className="text-xs font-bold text-brand-orange uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2">
          <Megaphone className="w-4 h-4 text-brand-orange" />
          <span>Official Announcements & Live Chat</span>
        </span>
        <h1 className="font-heading font-black text-4xl text-white">COMMUNITY HUB</h1>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-6">
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div key={ann.id} className="glass-card rounded-2xl p-6 border border-surface-border space-y-2 relative">
              {ann.isPinned && (
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-brand-gold uppercase px-2.5 py-0.5 rounded bg-brand-gold/20 mb-1">
                  <Pin className="w-3 h-3" /> Pinned Announcement
                </span>
              )}
              <h3 className="font-heading font-extrabold text-xl text-white">{ann.title}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{ann.content}</p>
              <div className="text-[11px] text-gray-500 pt-2">{new Date(ann.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
