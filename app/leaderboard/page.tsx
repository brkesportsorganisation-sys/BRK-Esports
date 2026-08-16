'use client';

import React, { useState } from 'react';
import { Award, Trophy, Users, Search, Flame, Shield } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { playerLeaderboard, teamLeaderboard } from '@/lib/mock-data';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'PLAYERS' | 'TEAMS'>('PLAYERS');
  const [searchQuery, setSearchQuery] = useState('');

  const currentList = activeTab === 'PLAYERS' ? playerLeaderboard : teamLeaderboard;

  const filteredList = currentList.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.tag && item.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.ffUid && item.ffUid.includes(searchQuery))
  );

  const top1 = filteredList[0];
  const top2 = filteredList[1];
  const top3 = filteredList[2];

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-body">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-surface/60 border-b border-surface-border py-12 relative overflow-hidden">
        <div className="absolute -top-20 right-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-xs font-bold text-brand-gold uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2">
            <Award className="w-4 h-4 text-brand-gold" />
            <span>Season 5 Championship Rankings</span>
          </span>
          <h1 className="font-heading font-black text-4xl sm:text-5xl text-white">
            HALL OF CHAMPIONS
          </h1>
          <p className="text-gray-400 text-sm mt-2 max-w-xl mx-auto">
            The most formidable Free Fire players and clans fighting for total dominance and maximum cash earnings.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-10">
        
        {/* Toggle Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 bg-surface-light p-1.5 rounded-2xl border border-surface-border w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('PLAYERS')}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-heading font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'PLAYERS'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-neon-red'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Player Ranking</span>
            </button>
            <button
              onClick={() => setActiveTab('TEAMS')}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-heading font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'TEAMS'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-neon-red'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Clan / Squad Ranking</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player, tag, or FF UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-light border border-surface-border rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-orange"
            />
          </div>
        </div>

        {/* Top 3 Podium Showcase */}
        {filteredList.length >= 3 && !searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 max-w-4xl mx-auto">
            
            {/* Rank 2 - Silver */}
            {top2 && (
              <div className="glass-card rounded-3xl p-6 text-center border-2 border-gray-400/30 relative order-2 md:order-1">
                <div className="w-10 h-10 rounded-full bg-gray-300 text-black font-heading font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-md">
                  #2
                </div>
                {top2.avatar && (
                  <img src={top2.avatar} alt={top2.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover border-2 border-gray-400" />
                )}
                <h3 className="font-heading font-black text-xl text-white">{top2.name}</h3>
                {top2.tag && <div className="text-xs text-brand-orange font-bold font-mono">[{top2.tag}]</div>}
                <div className="text-xl font-heading font-extrabold text-brand-gold mt-2">৳ {top2.earnings.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">{top2.kills} Kills • {top2.wins} Wins</div>
              </div>
            )}

            {/* Rank 1 - Gold */}
            {top1 && (
              <div className="glass-card rounded-3xl p-8 text-center border-2 border-brand-gold/60 shadow-neon-gold relative order-1 md:order-2 md:-translate-y-4">
                <div className="w-12 h-12 rounded-full bg-brand-gold text-black font-heading font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-neon-gold">
                  🥇 #1
                </div>
                {top1.avatar && (
                  <img src={top1.avatar} alt={top1.name} className="w-20 h-20 rounded-2xl mx-auto mb-3 object-cover border-4 border-brand-gold shadow-neon-gold" />
                )}
                <h3 className="font-heading font-black text-2xl text-white">{top1.name}</h3>
                {top1.tag && <div className="text-xs text-brand-gold font-bold font-mono">[{top1.tag}]</div>}
                <div className="text-2xl font-heading font-black text-brand-gold mt-2">৳ {top1.earnings.toLocaleString()}</div>
                <div className="text-xs text-gray-300 font-semibold mt-1">{top1.kills} Kills • {top1.wins} Booyahs</div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3 && (
              <div className="glass-card rounded-3xl p-6 text-center border-2 border-amber-700/40 relative order-3">
                <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-heading font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-md">
                  #3
                </div>
                {top3.avatar && (
                  <img src={top3.avatar} alt={top3.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover border-2 border-amber-700" />
                )}
                <h3 className="font-heading font-black text-xl text-white">{top3.name}</h3>
                {top3.tag && <div className="text-xs text-brand-orange font-bold font-mono">[{top3.tag}]</div>}
                <div className="text-xl font-heading font-extrabold text-brand-gold mt-2">৳ {top3.earnings.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">{top3.kills} Kills • {top3.wins} Wins</div>
              </div>
            )}

          </div>
        )}

        {/* Detailed Leaderboard Table */}
        <div className="glass-card rounded-2xl overflow-hidden border border-surface-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-light border-b border-surface-border text-xs uppercase font-bold text-gray-400">
                <tr>
                  <th className="p-4 text-center">Rank</th>
                  <th className="p-4">{activeTab === 'PLAYERS' ? 'Player Name' : 'Team Name'}</th>
                  {activeTab === 'PLAYERS' && <th className="p-4">Free Fire UID</th>}
                  <th className="p-4 text-center">Total Kills</th>
                  <th className="p-4 text-center">Total Wins</th>
                  <th className="p-4 text-right">Total Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-light/50 transition-colors">
                    <td className="p-4 text-center font-heading font-extrabold text-base">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl ${
                        item.rank === 1 ? 'bg-brand-gold text-black font-black' :
                        item.rank === 2 ? 'bg-gray-300 text-black font-black' :
                        item.rank === 3 ? 'bg-amber-700 text-white font-black' :
                        'bg-surface-light text-gray-400'
                      }`}>
                        #{item.rank}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {item.avatar && (
                          <img src={item.avatar} alt={item.name} className="w-9 h-9 rounded-xl object-cover border border-surface-border" />
                        )}
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.tag && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-red/20 text-brand-red uppercase font-extrabold">[{item.tag}]</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    {activeTab === 'PLAYERS' && (
                      <td className="p-4 font-mono text-xs text-brand-cyan">{item.ffUid || 'N/A'}</td>
                    )}
                    <td className="p-4 text-center font-bold text-white">{item.kills}</td>
                    <td className="p-4 text-center font-bold text-brand-orange">{item.wins}</td>
                    <td className="p-4 text-right font-heading font-black text-brand-gold text-base">
                      ৳ {item.earnings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
