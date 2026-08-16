'use client';

import React, { useState, useEffect } from 'react';
import { Award, Trophy, Users, Search, Flame, Shield, Loader2 } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { playerLeaderboard, teamLeaderboard } from '@/lib/mock-data';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'PLAYERS' | 'TEAMS'>('PLAYERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState(playerLeaderboard);
  const [teams, setTeams] = useState(teamLeaderboard);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          if (data.players && data.players.length > 0) {
            setPlayers(data.players);
          }
          if (data.teams && data.teams.length > 0) {
            setTeams(data.teams);
          }
        }
      } catch (err) {
        console.warn('Using cached leaderboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, []);

  const currentList = activeTab === 'PLAYERS' ? players : teams;

  const filteredList = currentList.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.tag && item.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.ffUid && item.ffUid.includes(searchQuery))
  );

  const top1 = filteredList[0];
  const top2 = filteredList[1];
  const top3 = filteredList[2];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 py-12 sm:py-16 relative overflow-hidden">
        <div className="absolute -top-20 right-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-2">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-widest inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Season 5 Championship Rankings</span>
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
            HALL OF CHAMPIONS
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            The most formidable Free Fire players and clans fighting for total dominance and maximum cash earnings.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* Toggle Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('PLAYERS')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'PLAYERS'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Player Ranking</span>
            </button>
            <button
              onClick={() => setActiveTab('TEAMS')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'TEAMS'
                  ? 'bg-gradient-to-r from-brand-red to-brand-orange text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Clan / Squad Ranking</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player, tag, or FF UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange shadow-xs transition-colors"
            />
          </div>
        </div>

        {/* Top 3 Podium Showcase */}
        {filteredList.length >= 3 && !searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 max-w-4xl mx-auto">
            
            {/* Rank 2 - Silver */}
            {top2 && (
              <div className="bg-white rounded-3xl p-6 text-center border-2 border-slate-300 shadow-sm relative order-2 md:order-1 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 font-heading font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
                  #2
                </div>
                {top2.avatar && (
                  <img src={top2.avatar} alt={top2.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover border-2 border-slate-300" />
                )}
                <h3 className="font-heading font-black text-lg text-slate-900">{top2.name}</h3>
                {top2.tag && <div className="text-xs text-brand-orange font-bold font-mono">[{top2.tag}]</div>}
                <div className="text-xl font-heading font-extrabold text-orange-600 mt-2">৳ {top2.earnings.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">{top2.kills} Kills • {top2.wins} Wins</div>
              </div>
            )}

            {/* Rank 1 - Gold */}
            {top1 && (
              <div className="bg-white rounded-3xl p-8 text-center border-2 border-amber-400 shadow-lg relative order-1 md:order-2 md:-translate-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-900 font-heading font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  🥇 #1
                </div>
                {top1.avatar && (
                  <img src={top1.avatar} alt={top1.name} className="w-20 h-20 rounded-2xl mx-auto mb-3 object-cover border-4 border-amber-400 shadow-sm" />
                )}
                <h3 className="font-heading font-black text-2xl text-slate-900">{top1.name}</h3>
                {top1.tag && <div className="text-xs text-amber-600 font-bold font-mono">[{top1.tag}]</div>}
                <div className="text-2xl font-heading font-black text-amber-600 mt-2">৳ {top1.earnings.toLocaleString()}</div>
                <div className="text-xs text-slate-600 font-semibold mt-1">{top1.kills} Kills • {top1.wins} Booyahs</div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3 && (
              <div className="bg-white rounded-3xl p-6 text-center border-2 border-amber-700/30 shadow-sm relative order-3 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-heading font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
                  #3
                </div>
                {top3.avatar && (
                  <img src={top3.avatar} alt={top3.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover border-2 border-amber-700/40" />
                )}
                <h3 className="font-heading font-black text-lg text-slate-900">{top3.name}</h3>
                {top3.tag && <div className="text-xs text-brand-orange font-bold font-mono">[{top3.tag}]</div>}
                <div className="text-xl font-heading font-extrabold text-orange-600 mt-2">৳ {top3.earnings.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">{top3.kills} Kills • {top3.wins} Wins</div>
              </div>
            )}

          </div>
        )}

        {/* Detailed Leaderboard Table */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-3.5 px-5 text-center">Rank</th>
                  <th className="py-3.5 px-5">{activeTab === 'PLAYERS' ? 'Player Name' : 'Team Name'}</th>
                  {activeTab === 'PLAYERS' && <th className="py-3.5 px-5">Free Fire UID</th>}
                  <th className="py-3.5 px-5 text-center">Total Kills</th>
                  <th className="py-3.5 px-5 text-center">Total Wins</th>
                  <th className="py-3.5 px-5 text-right">Total Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 text-center font-heading font-extrabold text-base">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                        item.rank === 1 ? 'bg-amber-100 text-amber-800' :
                        item.rank === 2 ? 'bg-slate-200 text-slate-800' :
                        item.rank === 3 ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        #{item.rank}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center space-x-3">
                        {item.avatar ? (
                          <img src={item.avatar} alt={item.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                            {item.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.tag && <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-50 text-brand-orange border border-orange-200 font-extrabold uppercase">[{item.tag}]</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    {activeTab === 'PLAYERS' && (
                      <td className="py-3.5 px-5 font-mono text-xs font-bold text-blue-600">{item.ffUid || 'N/A'}</td>
                    )}
                    <td className="py-3.5 px-5 text-center font-bold text-slate-800">{item.kills}</td>
                    <td className="py-3.5 px-5 text-center font-bold text-emerald-600">{item.wins}</td>
                    <td className="py-3.5 px-5 text-right font-heading font-black text-amber-600 text-sm sm:text-base">
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
