'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  Trophy, 
  Phone, 
  MessageCircle, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  RefreshCw,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { Tournament } from '@/lib/types';

function VendorRegistrationsContent() {
  const searchParams = useSearchParams();
  const initialTournamentId = searchParams.get('tournamentId') || '';

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(initialTournamentId);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const resT = await fetch('/api/vendor/tournaments', { credentials: 'include' });
      if (resT.ok) {
        const dataT = await resT.json();
        const list: Tournament[] = dataT.tournaments || [];
        setTournaments(list);

        const chosenId = selectedTournamentId || (list.length > 0 ? list[0].id : '');
        if (chosenId) {
          setSelectedTournamentId(chosenId);
          await loadRegistrations(chosenId);
        }
      }
    } catch (err) {
      console.warn('Failed to load tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async (tId: string) => {
    try {
      const resR = await fetch(`/api/vendor/registrations?tournamentId=${tId}`, { credentials: 'include' });
      if (resR.ok) {
        const dataR = await resR.json();
        setRegistrations(dataR.registrations || []);
      }
    } catch (err) {
      console.warn('Failed to load registrations:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTournamentSelect = async (tId: string) => {
    setSelectedTournamentId(tId);
    await loadRegistrations(tId);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredRegistrations = registrations.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.squadName?.toLowerCase().includes(q) ||
      r.iglName?.toLowerCase().includes(q) ||
      r.captainWhatsApp?.toLowerCase().includes(q) ||
      r.player1Name?.toLowerCase().includes(q) ||
      r.player2Name?.toLowerCase().includes(q)
    );
  });

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-cyan-400 font-bold">
              PARTICIPANT ROSTERS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-heading">
            Team Squad Rosters & Contact Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            View registered teams, captain WhatsApp contact, and squad rosters for tournament match coordination.
          </p>
        </div>

        <Link
          href="/vendor"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C101A] p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Trophy className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <select
            value={selectedTournamentId}
            onChange={(e) => handleTournamentSelect(e.target.value)}
            className="w-full md:w-auto rounded-xl border border-slate-800 bg-[#07090E] px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                {t.title} ({t.registeredCount}/{t.maxTeams} Teams)
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Squad Name, IGL, WhatsApp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#07090E] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Rosters Table */}
      <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="font-heading font-black text-base text-white">
              Registered Teams ({filteredRegistrations.length})
            </h2>
          </div>

          <button
            onClick={() => loadRegistrations(selectedTournamentId)}
            className="p-2 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {filteredRegistrations.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-400">No Teams Found for this Tournament</p>
            <p>Teams who purchase tournament slots will appear here with captain contact info.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredRegistrations.map((reg, index) => {
              const whatsappNum = reg.captainWhatsApp || reg.senderNumber || '';

              return (
                <div
                  key={reg.id || index}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center border border-cyan-500/20">
                        #{index + 1}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-white">
                          {reg.squadName || reg.userName || 'Team Alpha'}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">
                          IGL: <strong className="text-slate-200">{reg.iglName || reg.userName || 'Captain'}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {whatsappNum && (
                        <a
                          href={`https://wa.me/${whatsappNum.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Captain</span>
                        </a>
                      )}

                      {whatsappNum && (
                        <button
                          onClick={() => handleCopy(whatsappNum)}
                          className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Copy phone number"
                        >
                          {copiedText === whatsappNum ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Player Rosters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-[#07090E] border border-slate-800/60">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Player 1 (IGL)</div>
                      <div className="font-semibold text-slate-200 truncate">{reg.player1Name || reg.iglName || 'Slot 1'}</div>
                    </div>

                    <div className="p-2 rounded-xl bg-[#07090E] border border-slate-800/60">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Player 2</div>
                      <div className="font-semibold text-slate-200 truncate">{reg.player2Name || 'Slot 2'}</div>
                    </div>

                    <div className="p-2 rounded-xl bg-[#07090E] border border-slate-800/60">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Player 3</div>
                      <div className="font-semibold text-slate-200 truncate">{reg.player3Name || 'Slot 3'}</div>
                    </div>

                    <div className="p-2 rounded-xl bg-[#07090E] border border-slate-800/60">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Player 4</div>
                      <div className="font-semibold text-slate-200 truncate">{reg.player4Name || 'Slot 4'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default function VendorRegistrationsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-violet-400 font-mono text-xs">LOADING ROSTERS...</div>}>
      <VendorRegistrationsContent />
    </Suspense>
  );
}
