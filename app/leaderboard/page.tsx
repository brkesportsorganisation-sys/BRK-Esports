'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, Trophy, Users, Search, Flame, Shield, Loader2, Crown, ExternalLink } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  tag?: string;
  avatar?: string;
  logo?: string;
  ffUid?: string;
  captainName?: string;
  captainId?: string;
  membersCount?: number;
  game?: string;
  kills: number;
  wins: number;
  earnings: number;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'PLAYERS' | 'TEAMS'>('PLAYERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.warn('Leaderboard fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 6000);
    return () => clearInterval(interval);
  }, []);

  const currentList = activeTab === 'PLAYERS' ? players : teams;

  const filteredList = currentList.filter(item =>
    (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.tag && item.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.ffUid && item.ffUid.includes(searchQuery)) ||
    (item.captainName && item.captainName.toLowerCase().includes(searchQuery.toLowerCase()))
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
            <span>Official Esports Championship Rankings</span>
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
            HALL OF CHAMPIONS
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            The most formidable Free Fire players and clans fighting for total dominance and maximum prize earnings.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        
        {/* Toggle Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('PLAYERS')}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
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
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-heading font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer ${
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
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'PLAYERS' ? "Search player, tag, or FF UID..." : "Search squad name, tag, or captain..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-brand-orange shadow-xs transition-colors"
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
                {top2.avatar ? (
                  <img src={top2.avatar} alt={top2.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover border-2 border-slate-300 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-black mx-auto mb-3">
                    {top2.name?.charAt(0)}
                  </div>
                )}
                <h3 className="font-heading font-black text-lg text-slate-900 truncate">{top2.name}</h3>
                {top2.tag && <div className="text-xs text-brand-orange font-bold font-mono">[{top2.tag}]</div>}
                {top2.captainName && <div className="text-[11px] text-slate-500 font-medium mt-0.5">Captain: <strong>{top2.captainName}</strong></div>}
                <div className="text-xl font-heading font-extrabold text-orange-600 mt-2">৳ {(top2.earnings || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-600 font-medium mt-1">{top2.kills || 0} Kills • {top2.wins || 0} Wins</div>
              </div>
            )}

            {/* Rank 1 - Gold */}
            {top1 && (
              <div className="bg-white rounded-3xl p-8 text-center border-2 border-amber-400 shadow-lg relative order-1 md:order-2 md:-translate-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-900 font-heading font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  🥇 #1
                </div>
                {top1.avatar ? (
                  <img src={top1.avatar} alt={top1.name} className="w-20 h-20 rounded-2xl mx-auto mb-3 object-cover border-4 border-amber-400 shadow-md" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center text-xl font-black mx-auto mb-3">
                    {top1.name?.charAt(0)}
                  </div>
                )}
                <h3 className="font-heading font-black text-2xl text-slate-900 truncate">{top1.name}</h3>
                {top1.tag && <div className="text-xs text-amber-600 font-bold font-mono">[{top1.tag}]</div>}
                {top1.captainName && <div className="text-xs text-slate-600 font-medium mt-0.5">Captain: <strong className="text-slate-900">{top1.captainName}</strong></div>}
                <div className="text-2xl font-heading font-black text-amber-600 mt-2">৳ {(top1.earnings || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-600 font-semibold mt-1">{top1.kills || 0} Kills • {top1.wins || 0} Booyahs</div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3 && (
              <div className="bg-white rounded-3xl p-6 text-center border-2 border-amber-700/30 shadow-sm relative order-3 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-heading font-black text-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
                  #3
                </div>
                {top3.avatar ? (
                  <img src={top3.avatar} alt={top3.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover border-2 border-amber-700/40 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-black mx-auto mb-3">
                    {top3.name?.charAt(0)}
                  </div>
                )}
                <h3 className="font-heading font-black text-lg text-slate-900 truncate">{top3.name}</h3>
                {top3.tag && <div className="text-xs text-brand-orange font-bold font-mono">[{top3.tag}]</div>}
                {top3.captainName && <div className="text-[11px] text-slate-500 font-medium mt-0.5">Captain: <strong>{top3.captainName}</strong></div>}
                <div className="text-xl font-heading font-extrabold text-orange-600 mt-2">৳ {(top3.earnings || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-600 font-medium mt-1">{top3.kills || 0} Kills • {top3.wins || 0} Wins</div>
              </div>
            )}

          </div>
        )}

        {/* Detailed Leaderboard Table - Ultra Compact & Responsive */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] sm:text-xs uppercase font-extrabold text-slate-600 tracking-wider">
              <tr>
                <th className="py-3 px-2 sm:px-4 text-center w-10 sm:w-16">Rank</th>
                <th className="py-3 px-2 sm:px-4">{activeTab === 'PLAYERS' ? 'Player' : 'Squad / Clan'}</th>
                <th className="py-3 px-1.5 sm:px-3 text-center w-12 sm:w-20">Kills</th>
                <th className="py-3 px-1.5 sm:px-3 text-center w-12 sm:w-20">Wins</th>
                <th className="py-3 px-2 sm:px-4 text-right w-20 sm:w-28">Prize</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-500 text-xs font-medium">
                    <Loader2 className="w-6 h-6 text-brand-orange animate-spin mx-auto mb-2" />
                    <div>Loading live rankings from database...</div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-500 text-xs font-medium">
                    <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-bold text-slate-700">
                      {activeTab === 'PLAYERS'
                        ? 'No player tournament rankings recorded yet in the database.'
                        : 'No squads registered yet in the database. Create a squad from the Teams tab to participate!'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Rank Badge */}
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center font-heading font-black">
                      <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[10px] sm:text-xs font-black ${
                        item.rank === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                        item.rank === 2 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                        item.rank === 3 ? 'bg-orange-100 text-orange-900 border border-orange-200' :
                        'bg-slate-100 text-slate-600 font-bold'
                      }`}>
                        #{item.rank}
                      </span>
                    </td>
                    
                    {/* Name / Avatar Cell */}
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 min-w-0">
                      {activeTab === 'TEAMS' ? (
                        <Link href={`/squads/${item.id}`} className="flex items-center gap-2 sm:gap-3 group cursor-pointer min-w-0">
                          {item.avatar || item.logo ? (
                            <img
                              src={item.avatar || item.logo}
                              alt={item.name}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl object-cover border border-slate-200 group-hover:border-amber-400 transition-colors shrink-0 bg-slate-900"
                            />
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {item.name?.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 group-hover:text-amber-600 transition-colors truncate">
                              <span className="truncate">{item.name}</span>
                              {item.tag && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono font-black uppercase shrink-0">
                                  [{item.tag}]
                                </span>
                              )}
                            </div>
                            {item.captainName && (
                              <div className="text-[10px] text-slate-500 font-medium truncate hidden sm:block">
                                Cap: {item.captainName}
                              </div>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-900"
                            />
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {item.name?.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 truncate">
                              <span className="truncate">{item.name}</span>
                              {item.tag && (
                                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-orange-50 text-brand-orange border border-orange-200 font-extrabold uppercase shrink-0">
                                  [{item.tag}]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Total Kills */}
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-bold text-slate-700 text-xs sm:text-sm">
                      {item.kills || 0}
                    </td>

                    {/* Total Wins */}
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-3 text-center font-bold text-emerald-600 text-xs sm:text-sm">
                      {item.wins || 0}
                    </td>

                    {/* Total Earnings / Prize */}
                    <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right font-heading font-black text-amber-600 text-xs sm:text-sm whitespace-nowrap">
                      ৳ {(item.earnings || 0).toLocaleString()}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </main>

      <Footer />
    </div>
  );
}

