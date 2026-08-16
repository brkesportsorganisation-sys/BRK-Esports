import React from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { prisma } from '@/lib/prisma';
import { Youtube, Flame, Trophy, Users, Calendar, Banknote } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Live Tournament | Black Rock Esports',
  description: 'Watch live Free Fire tournaments and matches on Black Rock Esports.',
};

export const revalidate = 10; // revalidate every 10 seconds

export default async function LivePage() {
  const liveSetting = await prisma.siteSetting.findUnique({
    where: { key: 'YOUTUBE_LIVE_URL' },
  });

  const savedUrl = liveSetting?.value || '';
  
  interface StreamData { url: string; tournamentId: string; }
  let streams: StreamData[] = [];
  
  try {
    const parsed = JSON.parse(savedUrl);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        streams = parsed.map(u => ({ url: u, tournamentId: '' }));
      } else {
        streams = parsed;
      }
    } else if (savedUrl && !savedUrl.startsWith('[')) {
      streams = [{ url: savedUrl, tournamentId: '' }];
    }
  } catch {
    streams = savedUrl ? [{ url: savedUrl, tournamentId: '' }] : [];
  }

  const tournamentIds = [...new Set(streams.map(s => s.tournamentId).filter(Boolean))];
  const tournaments = await prisma.tournament.findMany({
    where: { id: { in: tournamentIds } }
  });
  
  const tournamentMap = new Map(tournaments.map(t => [t.id, t]));

  // Extract YouTube ID
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([^&?#]+)/);
    return match && match[1].length === 11 ? match[1] : null;
  };


  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-brand-red/30">
      <Navbar />

      <main className="flex-grow pt-24 pb-20 lg:pt-28 lg:pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center space-x-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-brand-red font-bold uppercase tracking-widest text-sm animate-pulse">
            <Flame className="w-4 h-4" />
            <span>Live Broadcast</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white font-heading tracking-tight uppercase">
            Watch our daily Free Fire tournaments live! Join the stream, cheer for your favorite squads, and don't miss the intense action.
          </h1>
        </div>

        <div className={`grid gap-8 ${streams.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {streams.length > 0 ? (
            streams.map((stream, index) => {
              const id = getYoutubeId(stream.url);
              if (!id) return null;
              
              const t = stream.tournamentId ? tournamentMap.get(stream.tournamentId) : null;
              
              return (
                <div key={index} className="flex flex-col space-y-4">
                  {t && (
                    <div className="p-4 rounded-xl bg-slate-900/50 backdrop-blur-md border border-brand-red/30 shadow-lg shadow-brand-red/5 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-red/10 to-transparent opacity-50"></div>
                      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-red text-white rounded-md whitespace-nowrap">Live Match</span>
                            <span className="text-xs text-gray-400 truncate">{t.mode} • {t.format.replace('_', ' ')}</span>
                          </div>
                          <h2 className="text-lg md:text-xl font-black text-white font-heading uppercase truncate w-full" title={t.title}>
                            {t.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1"><Banknote className="w-3 h-3 text-brand-orange" /> ৳{t.prizePool}</div>
                            <div className="flex items-center gap-1"><Users className="w-3 h-3 text-brand-cyan" /> Teams: {t.maxTeams}</div>
                          </div>
                        </div>
                        <Link href={`/tournaments/${t.id}`} className="shrink-0">
                          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/20 transition-all flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5" /> View
                          </button>
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black relative group shadow-cyber border border-brand-red/20 shadow-brand-red/10">
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-brand-red via-brand-orange to-brand-red rounded-2xl opacity-20 blur-sm group-hover:opacity-40 transition-opacity duration-500" />
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=${index === 0 ? '1' : '0'}`}
                      title={`YouTube video player ${index + 1}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 border-0"
                    ></iframe>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="aspect-video w-full rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center p-6 space-y-4 col-span-full">
              <Youtube className="w-20 h-20 text-gray-700 mx-auto" />
              <div>
                <h3 className="text-2xl font-heading font-bold text-gray-400">OFFLINE</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">There is no live tournament broadcasting at the moment. Please check back later or view our tournament schedule.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
