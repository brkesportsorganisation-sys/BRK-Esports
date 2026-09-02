'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Tv,
  Plus,
  Trash2,
  Edit3,
  Save,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Gamepad2,
  Users,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';
import {
  Tournament,
  TournamentRoom,
  TournamentRoadmapConfig,
  TournamentStage,
  TournamentRoadmapRuleItem
} from '@/lib/types';
import { generateDefaultRoadmap, formatRoomLabel } from '@/lib/tournament-rooms-utils';

const toLocalISO = (dateString?: string | Date | null) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminRoadmapsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('success');
  const [csrfToken, setCsrfToken] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState('ALL');

  // Active Tournament Roadmap State
  const [roadmapConfig, setRoadmapConfig] = useState<TournamentRoadmapConfig | null>(null);
  const [rooms, setRooms] = useState<TournamentRoom[]>([]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageEditForm, setStageEditForm] = useState({
    name: '',
    subtitle: '',
    status: 'UPCOMING' as 'UPCOMING' | 'LIVE' | 'COMPLETED',
    matchTime: '',
    mapRotation: 'Bermuda',
    advancingPerGroup: 3,
    streamUrl: '',
    customRules: '',
  });

  // 1. Fetch Tournaments and CSRF Token
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [csrfRes, toursRes] = await Promise.all([
          fetch('/api/csrf').then(r => r.json()).catch(() => ({ csrfToken: '' })),
          fetch('/api/admin/tournaments', { credentials: 'include' }).then(r => r.json()).catch(() => ({ tournaments: [] })),
        ]);

        if (csrfRes.csrfToken) setCsrfToken(csrfRes.csrfToken);
        const tourList: Tournament[] = Array.isArray(toursRes.tournaments) ? toursRes.tournaments : [];
        setTournaments(tourList);

        if (tourList.length > 0) {
          setSelectedTourId(tourList[0].id);
        }
      } catch (err) {
        console.error('Failed to initialize roadmaps admin:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 2. Load Selected Tournament Roadmap & Rooms
  const loadRoadmapData = async (tourId: string) => {
    if (!tourId) return;
    try {
      const targetTour = tournaments.find(t => t.id === tourId);
      const res = await fetch(`/api/tournaments/${tourId}/rooms`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const loadedRooms = data.rooms || [];
        setRooms(loadedRooms);
        if (data.roadmap) {
          setRoadmapConfig(data.roadmap);
        } else {
          setRoadmapConfig(generateDefaultRoadmap(targetTour || { id: tourId }, loadedRooms));
        }
      }
    } catch (err) {
      console.warn('Failed to load roadmap data:', err);
    }
  };

  useEffect(() => {
    if (selectedTourId) {
      loadRoadmapData(selectedTourId);
      setEditingStageId(null);
    }
  }, [selectedTourId, tournaments]);

  const selectedTournament = useMemo(() => {
    return tournaments.find(t => t.id === selectedTourId) || null;
  }, [tournaments, selectedTourId]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const matchGame = gameFilter === 'ALL' || t.game === gameFilter;
      const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGame && matchSearch;
    });
  }, [tournaments, gameFilter, searchQuery]);

  // Actions
  const handleAutoGenerateStages = () => {
    if (!selectedTournament) return;
    const generated = generateDefaultRoadmap(selectedTournament, rooms);
    setRoadmapConfig(generated);
    setFeedbackTone('success');
    setFeedback('Auto-generated multi-stage schedule! Remember to click "Save & Publish Roadmap".');
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAddStage = () => {
    if (!roadmapConfig) return;
    const currentStages = roadmapConfig.stages || [];
    const newStageNumber = currentStages.length + 1;
    const newStage: TournamentStage = {
      id: `STAGE_${Date.now()}`,
      stageNumber: newStageNumber,
      name: `Round ${newStageNumber}: ${newStageNumber === 1 ? 'Qualifiers' : newStageNumber === 2 ? 'Quarter-Finals' : newStageNumber === 3 ? 'Semi-Finals' : 'Grand Finals'}`,
      subtitle: `${rooms.length || 1} Groups • Top 3 Advance`,
      status: 'UPCOMING',
      mapRotation: ['Bermuda', 'Purgatory'],
      advancingPerGroup: 3,
      totalAdvancing: 12,
      customRules: 'Standard tournament progression rules apply.',
    };
    setRoadmapConfig({
      ...roadmapConfig,
      stages: [...currentStages, newStage],
    });
  };

  const handleDeleteStage = (stageId: string) => {
    if (!roadmapConfig) return;
    const updatedStages = (roadmapConfig.stages || []).filter(s => s.id !== stageId);
    setRoadmapConfig({ ...roadmapConfig, stages: updatedStages });
  };

  const startEditStage = (stage: TournamentStage) => {
    setEditingStageId(stage.id);
    setStageEditForm({
      name: stage.name,
      subtitle: stage.subtitle || '',
      status: stage.status,
      matchTime: toLocalISO(stage.matchTime),
      mapRotation: (stage.mapRotation || []).join(', '),
      advancingPerGroup: stage.advancingPerGroup || 3,
      streamUrl: stage.streamUrl || '',
      customRules: stage.customRules || '',
    });
  };

  const handleSaveStageEdit = (stageId: string) => {
    if (!roadmapConfig) return;
    const mapArray = stageEditForm.mapRotation
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);
    const updatedStages = (roadmapConfig.stages || []).map(s => {
      if (s.id === stageId) {
        return {
          ...s,
          name: stageEditForm.name,
          subtitle: stageEditForm.subtitle,
          status: stageEditForm.status,
          matchTime: stageEditForm.matchTime ? new Date(stageEditForm.matchTime).toISOString() : undefined,
          mapRotation: mapArray.length > 0 ? mapArray : ['Bermuda'],
          advancingPerGroup: Number(stageEditForm.advancingPerGroup) || 3,
          streamUrl: stageEditForm.streamUrl || undefined,
          customRules: stageEditForm.customRules || undefined,
        };
      }
      return s;
    });
    setRoadmapConfig({ ...roadmapConfig, stages: updatedStages });
    setEditingStageId(null);
  };

  const handleUpdateRoomField = (roomId: string, field: keyof TournamentRoom, value: any) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, [field]: value } : r));
  };

  const handleSaveFullRoadmap = async () => {
    if (!selectedTournament || !roadmapConfig) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedTournament.id}/roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          roadmapConfig,
          roomsList: rooms,
        }),
      });

      if (res.ok) {
        setFeedbackTone('success');
        setFeedback('Tournament Roadmap & Schedules published successfully!');
        await loadRoadmapData(selectedTournament.id);
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedbackTone('error');
        setFeedback(err?.message || 'Failed to save roadmap');
      }
    } catch (err: any) {
      setFeedbackTone('error');
      setFeedback(err?.message || 'Failed to reach server');
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="rounded-3xl border border-slate-800/80 bg-[#111827]/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Calendar className="w-5 h-5" />
              </span>
              <p className="text-xs uppercase tracking-[0.35em] text-brand-gold font-bold">Multi-Stage Progression Pipeline</p>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-heading font-black text-white">ROADMAP &amp; SCHEDULES CENTER</h1>
            <p className="mt-1 text-xs text-slate-300 font-medium">
              Configure multi-stage tournaments (Round 1, Quarter-Finals, Semi-Finals, Grand Finals), map rotations, match timing, stream URLs, and advancement rules.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/groups"
              className="inline-flex items-center gap-2 rounded-2xl border border-purple-800/80 bg-purple-950/60 px-4 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-900 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>Manage Groups &amp; Squads</span>
            </Link>

            <button
              onClick={handleSaveFullRoadmap}
              disabled={isSaving || !selectedTournament}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-brand-red px-5 py-3 font-heading font-black text-xs text-white shadow-neon-amber hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>SAVE &amp; PUBLISH ROADMAP</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold flex items-center gap-2 ${feedbackTone === 'error' ? 'border-red-900/50 bg-red-950/40 text-red-300' : 'border-emerald-900/50 bg-emerald-950/40 text-emerald-300'}`}>
            {feedbackTone === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{feedback}</span>
          </div>
        )}

        {/* 2. Tournament Selector Bar */}
        <div className="mt-6 p-4 rounded-2xl border border-slate-800 bg-slate-900/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-bold text-slate-300 shrink-0">Select Tournament:</label>
            <select
              value={selectedTourId}
              onChange={(e) => setSelectedTourId(e.target.value)}
              className="w-full sm:max-w-md px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white outline-none focus:border-amber-500 cursor-pointer"
            >
              {filteredTournaments.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.game === 'FREE_FIRE' ? '🔥 Free Fire' : t.game === 'PUBG_MOBILE' ? '🪖 PUBG' : t.game}) - {t.status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoGenerateStages}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Auto-calculate stages based on registered squads and room capacity"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              <span>⚡ Auto-Generate Stages</span>
            </button>
            <button
              onClick={handleAddStage}
              className="px-3.5 py-2 rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-700/80 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stage</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Roadmap Editor */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-sm font-medium">Loading tournament roadmap configuration...</span>
        </div>
      ) : !selectedTournament ? (
        <div className="p-16 text-center text-slate-400 rounded-3xl border border-slate-800 bg-slate-900/40">
          No tournament selected. Please choose a tournament above.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Title & Format Customization */}
          <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand-gold" />
              <span>Tournament Roadmap Header &amp; Subtitles</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Pipeline Title</label>
                <input
                  type="text"
                  value={roadmapConfig?.pipelineTitle || ''}
                  onChange={(e) =>
                    setRoadmapConfig((prev) =>
                      prev ? { ...prev, pipelineTitle: e.target.value } : null
                    )
                  }
                  placeholder="TOURNAMENT ROADMAP & SCHEDULE"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs font-bold text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Format Badge</label>
                <input
                  type="text"
                  value={roadmapConfig?.pipelineFormat || ''}
                  onChange={(e) =>
                    setRoadmapConfig((prev) =>
                      prev ? { ...prev, pipelineFormat: e.target.value } : null
                    )
                  }
                  placeholder="🔥 Format A: Qualifiers → Grand Finals"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs font-bold text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Pipeline Subtitle</label>
                <input
                  type="text"
                  value={roadmapConfig?.pipelineSubtitle || ''}
                  onChange={(e) =>
                    setRoadmapConfig((prev) =>
                      prev ? { ...prev, pipelineSubtitle: e.target.value } : null
                    )
                  }
                  placeholder="Multi-Stage tournament progression, match timings & map rotation"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Stages List */}
          <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-orange" />
                  <span>Tournament Stages ({roadmapConfig?.stages?.length || 0} Stages)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Order of match stages from preliminary qualifiers through to the championship finals.
                </p>
              </div>

              <button
                onClick={handleAddStage}
                className="px-3.5 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-300 text-xs font-bold border border-amber-700 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stage</span>
              </button>
            </div>

            <div className="grid gap-4">
              {(roadmapConfig?.stages || []).map((stage, sIdx) => {
                const isEditing = editingStageId === stage.id;
                return (
                  <div
                    key={stage.id || sIdx}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-950/80 transition-all hover:border-slate-700 space-y-4"
                  >
                    {!isEditing ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-700/80 text-amber-300 font-heading font-black text-sm flex items-center justify-center shrink-0">
                            {stage.stageNumber || sIdx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-white text-sm">{stage.name}</h4>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                  stage.status === 'LIVE'
                                    ? 'bg-red-950 border-red-700 text-red-300 animate-pulse'
                                    : stage.status === 'COMPLETED'
                                    ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                                    : 'bg-slate-900 border-slate-700 text-slate-400'
                                }`}
                              >
                                {stage.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                              {stage.subtitle && <span>{stage.subtitle}</span>}
                              {stage.matchTime && (
                                <span className="flex items-center gap-1 text-slate-300">
                                  <Clock className="w-3 h-3 text-brand-orange" />
                                  {new Date(stage.matchTime).toLocaleString()}
                                </span>
                              )}
                              {stage.mapRotation && stage.mapRotation.length > 0 && (
                                <span className="flex items-center gap-1 text-brand-gold">
                                  <MapPin className="w-3 h-3" />
                                  {stage.mapRotation.join(' • ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => startEditStage(stage)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Stage</span>
                          </button>
                          <button
                            onClick={() => handleDeleteStage(stage.id)}
                            className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900 text-red-400 border border-red-900 transition-all cursor-pointer"
                            title="Delete Stage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Stage Inline Edit Form */
                      <div className="space-y-4 pt-2">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Stage Name</label>
                            <input
                              type="text"
                              value={stageEditForm.name}
                              onChange={(e) => setStageEditForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Stage Subtitle</label>
                            <input
                              type="text"
                              value={stageEditForm.subtitle}
                              onChange={(e) => setStageEditForm(prev => ({ ...prev, subtitle: e.target.value }))}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Stage Status</label>
                            <select
                              value={stageEditForm.status}
                              onChange={(e) => setStageEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-amber-500"
                            >
                              <option value="UPCOMING">⏳ UPCOMING</option>
                              <option value="LIVE">🔴 LIVE</option>
                              <option value="COMPLETED">🏁 COMPLETED</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Match Date &amp; Time</label>
                            <input
                              type="datetime-local"
                              value={stageEditForm.matchTime}
                              onChange={(e) => setStageEditForm(prev => ({ ...prev, matchTime: e.target.value }))}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Map Rotation (Comma Separated)</label>
                            <input
                              type="text"
                              value={stageEditForm.mapRotation}
                              onChange={(e) => setStageEditForm(prev => ({ ...prev, mapRotation: e.target.value }))}
                              placeholder="Bermuda, Purgatory, Kalahari"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Live Stream Link</label>
                            <input
                              type="url"
                              value={stageEditForm.streamUrl}
                              onChange={(e) => setStageEditForm(prev => ({ ...prev, streamUrl: e.target.value }))}
                              placeholder="https://youtube.com/live/..."
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => setEditingStageId(null)}
                            className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-400 text-xs font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveStageEdit(stage.id)}
                            className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                          >
                            Apply Stage Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group Schedules & Map Rotation Allocation Matrix */}
          <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-brand-orange" />
                  <span>Group Specific Match Times &amp; Map Rotations</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set specific schedule timings and maps per group (e.g. Group 1 @ 07:00 PM Bermuda, Group 2 @ 07:45 PM Purgatory).
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {rooms.map((room) => {
                const isFinal = room.roomType === 'FINAL' || room.roomLabel.toLowerCase() === 'final';
                return (
                  <div
                    key={room.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isFinal
                        ? 'bg-purple-950/40 border-purple-800/80'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-white text-sm">
                          {formatRoomLabel(room.roomLabel, room.roomType)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 font-mono">
                          {room.currentCount || 0}/{room.capacity || 12} Squads
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Group Match Time</label>
                        <input
                          type="datetime-local"
                          value={toLocalISO(room.matchTime)}
                          onChange={(e) => handleUpdateRoomField(room.id, 'matchTime', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Match Map Name</label>
                        <input
                          type="text"
                          value={room.mapName || 'Bermuda'}
                          onChange={(e) => handleUpdateRoomField(room.id, 'mapName', e.target.value)}
                          placeholder="e.g. Bermuda"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Live Stream URL</label>
                      <input
                        type="url"
                        value={room.streamUrl || ''}
                        onChange={(e) => handleUpdateRoomField(room.id, 'streamUrl', e.target.value)}
                        placeholder="https://youtube.com/live/..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules & Explainer Cards Builder */}
          <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-heading font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-gold" />
                  <span>Advancement Rules &amp; Explainer Cards</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cards displayed on the tournament details page explaining qualification steps.
                </p>
              </div>

              <button
                onClick={() => {
                  if (!roadmapConfig) return;
                  const currentRules = roadmapConfig.rules || [];
                  const newRule: TournamentRoadmapRuleItem = {
                    stepNumber: currentRules.length + 1,
                    title: `Rule #${currentRules.length + 1}`,
                    description: 'Rule explanation text here.',
                  };
                  setRoadmapConfig({
                    ...roadmapConfig,
                    rules: [...currentRules, newRule],
                  });
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-300 text-xs font-bold border border-amber-700 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Rule Card</span>
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(roadmapConfig?.rules || []).map((rule, rIdx) => (
                <div key={rule.stepNumber || rIdx} className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                      {rule.stepNumber || rIdx + 1}
                    </span>
                    <button
                      onClick={() => {
                        if (!roadmapConfig) return;
                        const updatedRules = (roadmapConfig.rules || []).filter((_, idx) => idx !== rIdx);
                        setRoadmapConfig({ ...roadmapConfig, rules: updatedRules });
                      }}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Card Title</label>
                    <input
                      type="text"
                      value={rule.title}
                      onChange={(e) => {
                        if (!roadmapConfig) return;
                        const updatedRules = [...(roadmapConfig.rules || [])];
                        updatedRules[rIdx] = { ...updatedRules[rIdx], title: e.target.value };
                        setRoadmapConfig({ ...roadmapConfig, rules: updatedRules });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Card Description</label>
                    <textarea
                      rows={3}
                      value={rule.description}
                      onChange={(e) => {
                        if (!roadmapConfig) return;
                        const updatedRules = [...(roadmapConfig.rules || [])];
                        updatedRules[rIdx] = { ...updatedRules[rIdx], description: e.target.value };
                        setRoadmapConfig({ ...roadmapConfig, rules: updatedRules });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-300 outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
