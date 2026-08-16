'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/db';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState<'ALL' | 'TOURNAMENT_PLAYERS'>('ALL');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    try {
      db.createAnnouncement({
        title,
        content: message,
        category: 'GENERAL',
        isPinned: false
      });

      setSentSuccess(true);
      setTimeout(() => {
        setTitle('');
        setMessage('');
        setSentSuccess(false);
      }, 3000);
    } catch (err) {
      alert('Error sending notification.');
    }
  };

  const handlePreset = (presetTitle: string, presetMsg: string) => {
    setTitle(presetTitle);
    setMessage(presetMsg);
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-4 text-slate-900 lg:p-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500 font-semibold">Broadcasting Hub</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">Push & System Notifications</h1>
            <p className="mt-2 text-sm text-slate-500">Broadcast match reminders, room credential alerts, and news to players.</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Preset Quick Buttons */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Quick Presets</div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handlePreset('🎮 Custom Room ID Published!', 'Room ID and Password for your registered match are now live on your match detail tab.')}
                className="px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-sm font-bold text-cyan-700 border border-cyan-200 transition-colors"
              >
                Room ID Alert
              </button>
              <button
                onClick={() => handlePreset('💰 Tournament Winnings Deposited', 'Congratulations! Your Booyah prize money has been credited to your Black Rock Wallet.')}
                className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-sm font-bold text-orange-600 border border-orange-200 transition-colors"
              >
                Payout Notice
              </button>
              <button
                onClick={() => handlePreset('⚠️ Anti-Cheat Warning', 'Using third-party script tools or modified APKs will result in permanent hardware ban.')}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-bold text-red-600 border border-red-200 transition-colors"
              >
                Anti-Cheat Warning
              </button>
            </div>
          </div>

          {/* Broadcast Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {sentSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Broadcast notification successfully dispatched to players!</span>
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-5">
              <div>
                <label className="font-semibold text-slate-700 block mb-2 text-sm">Target Audience</label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-300 transition-all shadow-sm"
                >
                  <option value="ALL">All Registered Players (Global Broadcast)</option>
                  <option value="TOURNAMENT_PLAYERS">Active Tournament Joined Players</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-2 text-sm">Notification Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. 🎮 Room Credentials Live!"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-300 transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-2 text-sm">Message Content <span className="text-red-500">*</span></label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Type your message to be pushed to user dashboards..."
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-300 transition-all shadow-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm shadow-md flex items-center justify-center space-x-2 hover:shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Send Broadcast Notification</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
