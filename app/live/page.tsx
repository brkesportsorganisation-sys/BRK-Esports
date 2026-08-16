import React from 'react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { supabaseAdmin } from '@/lib/supabase';
import { Youtube, Flame, Trophy, Users, Calendar, Banknote } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Live Tournament | Black Rock Esports',
  description: 'Watch live Free Fire tournaments and matches on Black Rock Esports.',
};

export const revalidate = 10; // revalidate every 10 seconds

export default async function LivePage() {
  const { data: liveSetting } = await supabaseAdmin
    .from('SiteSetting')
    .select('value')
    .eq('key', 'YOUTUBE_LIVE_URL')
    .single();

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
  let tournaments: any[] = [];
  if (tournamentIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('Tournament')
      .select('*')
      .in('id', tournamentIds);
    tournaments = data || [];
  }
  
  const tournamentMap = new Map(tournaments.map(t => [t.id, t]));

  // Extract YouTube ID
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([^&?#]+)/);
    return match && match[1].length === 11 ? match[1] : null;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow pt-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-8 text-center space-y-3">
          <div className="inline-flex items-center justify-center space-x-2 px-4 py-1.5 rounded-full bg-red-50 border border-brand-red/20 text-brand-red font-bold uppercase tracking-widest text-xs animate-pulse">
            <Flame className="w-3.5 h-3.5" />
            <span>Official Live Broadcast Stream</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 font-heading tracking-tight">
            WATCH LIVE FREE FIRE TOURNAMENTS
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto">
            Cheer for your favorite squads, watch high-tier tactical plays, and don't miss the intense Booyah action.
          </p>
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
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-red text-white rounded-md whitespace-nowrap">Live Match</span>
                            <span className="text-xs text-slate-500 font-semibold truncate">{t.mode} • {t.format.replace('_', ' ')}</span>
                          </div>
                          <h2 className="text-base md:text-lg font-black text-slate-900 font-heading uppercase truncate w-full" title={t.title}>
                            {t.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold">
                            <div className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5 text-orange-600" /> ৳{t.prizePool}</div>
                            <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-600" /> Teams: {t.maxTeams}</div>
                          </div>
                        </div>
                        <Link href={`/tournaments/${t.id}`} className="shrink-0">
                          <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-xs">
                            <Trophy className="w-3.5 h-3.5" /> View Match
                          </button>
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black relative group shadow-md border border-slate-200">
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
            <div className="aspect-video w-full rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center p-8 space-y-3 col-span-full">
              <Youtube className="w-16 h-16 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-xl font-heading font-bold text-slate-900">STREAM CURRENTLY OFFLINE</h3>
                <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">There is no live tournament broadcasting at the moment. Please check back later or view our tournament schedule.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
