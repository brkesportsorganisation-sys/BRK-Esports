'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Copy, Eye, Filter, Loader2, PlusCircle, Search, ShieldCheck, Sparkles, Star, Trash2, UploadCloud, X } from 'lucide-react';
import { Tournament, Mode, Format, TournamentStatus, CommunityAccessType, CommunityUnlockMode } from '@/lib/types';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const statusOptions: Array<'ALL' | TournamentStatus> = ['ALL', 'DRAFT', 'UPCOMING', 'LIVE', 'FINISHED', 'CANCELLED'];

const toLocalISO = (dateString?: string | Date | null) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface TournamentFormState {
  title: string;
  description: string;
  mode: Mode;
  format: Format;
  entryFee: number;
  prizePool: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  perKillPrize: number;
  maxTeams: number;
  roomId: string;
  roomPassword: string;
  roomEnabled: boolean;
  roomReleaseTime: string;
  status: TournamentStatus;
  tournamentStart: string;
  tournamentEnd: string;
  registrationStart: string;
  registrationEnd: string;
  timeZone: string;
  isPaused: boolean;
  bannerImage: string;
  thumbnailImage: string;
  logoImage: string;
  galleryImages: string[];
  isFeatured: boolean;
  isPublished: boolean;
  showOnHomepage: boolean;
  registrationOpen: boolean;
  liveMatchToggle: boolean;
  communityEnabled: boolean;
  communityAccessType: CommunityAccessType;
  communityInviteLink: string;
  communityName: string;
  communityDescription: string;
  hideInviteLinkFromPublic: boolean;
  communityUnlockMode: CommunityUnlockMode;
  communityIsDisabled: boolean;
  notifyOnPublish: boolean;
}

const defaultForm: TournamentFormState = {
  title: '',
  description: '',
  mode: 'SQUAD' as Mode,
  format: 'BR_RANKED' as Format,
  entryFee: 100,
  prizePool: 4000,
  firstPrize: 2000,
  secondPrize: 1000,
  thirdPrize: 500,
  perKillPrize: 10,
  maxTeams: 48,
  roomId: '',
  roomPassword: '',
  roomEnabled: false,
  roomReleaseTime: '',
  status: 'DRAFT' as TournamentStatus,
  tournamentStart: '',
  tournamentEnd: '',
  registrationStart: '',
  registrationEnd: '',
  timeZone: 'Asia/Dhaka',
  isPaused: false,
  bannerImage: '',
  thumbnailImage: '',
  logoImage: '',
  galleryImages: [] as string[],
  isFeatured: false,
  isPublished: false,
  showOnHomepage: true,
  registrationOpen: true,
  liveMatchToggle: false,
  communityEnabled: false,
  communityAccessType: 'WHATSAPP' as const,
  communityInviteLink: '',
  communityName: '',
  communityDescription: '',
  hideInviteLinkFromPublic: true,
  communityUnlockMode: 'SLOT_PURCHASE_ONLY' as const,
  communityIsDisabled: false,
  notifyOnPublish: false,
};

interface ValidationErrors {
  title?: string;
  description?: string;
  entryFee?: string;
  prizePool?: string;
  maxTeams?: string;
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TournamentStatus>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TournamentFormState>(defaultForm);
  const [csrfToken, setCsrfToken] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('success');
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [communityUsers, setCommunityUsers] = useState<Array<{ id: string; userId: string; userName: string; userEmail: string; status: string }>>([]);
  const [communityUsersLoading, setCommunityUsersLoading] = useState(false);
  const [descriptionHtmlMode, setDescriptionHtmlMode] = useState(false);

  useEffect(() => {
    const cookie = document.cookie.split('; ').find((item) => item.startsWith('admin_csrf='));
    setCsrfToken(cookie?.split('=')[1] || '');
    void loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const response = await fetch('/api/admin/tournaments', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setTournaments(data.tournaments || []);
      } else {
        console.error('[loadTournaments] Failed:', data.message);
      }
    } catch (err) {
      console.error('[loadTournaments] Network error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((item) => {
      const matchesSearch = `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tournaments]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setCommunityUsers([]);
    setValidationErrors({});
    setFeedback('');
    setModalOpen(false);
  };

  const openCreateModal = () => {
    setForm(defaultForm);
    setEditingId(null);
    setCommunityUsers([]);
    setValidationErrors({});
    setFeedback('');
    setModalOpen(true);
  };

  const loadCommunityUsers = async (tournamentId: string) => {
    if (!tournamentId) {
      setCommunityUsers([]);
      return;
    }
    setCommunityUsersLoading(true);
    const response = await fetch(`/api/admin/tournaments/${tournamentId}/community`, { credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setCommunityUsers(data.users || []);
    }
    setCommunityUsersLoading(false);
  };

  const handleRevokeCommunityAccess = async (userId: string) => {
    if (!editingId) return;
    const response = await fetch(`/api/admin/tournaments/${editingId}/community`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({ action: 'revoke', userId }),
    });
    if (response.ok) {
      await loadCommunityUsers(editingId);
      setFeedback('Community access revoked.');
    }
  };

  const openEditModal = (item: Tournament) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      mode: item.mode,
      format: item.format,
      entryFee: item.entryFee,
      prizePool: item.prizePool,
      firstPrize: item.firstPrize,
      secondPrize: item.secondPrize,
      thirdPrize: item.thirdPrize,
      perKillPrize: item.perKillPrize,
      maxTeams: item.maxTeams,
      roomId: item.roomId || '',
      roomPassword: item.roomPassword || '',
      roomEnabled: item.roomEnabled || false,
      roomReleaseTime: toLocalISO(item.roomReleaseTime),
      status: item.status,
      tournamentStart: toLocalISO(item.tournamentStart || item.matchTime),
      tournamentEnd: toLocalISO(item.tournamentEnd),
      registrationStart: toLocalISO(item.registrationStart),
      registrationEnd: toLocalISO(item.registrationEnd || item.registrationDeadline),
      timeZone: item.timeZone || 'Asia/Dhaka',
      isPaused: item.isPaused || false,
      bannerImage: item.bannerImage || '',
      thumbnailImage: item.thumbnailImage || '',
      logoImage: item.logoImage || '',
      galleryImages: item.galleryImages || [],
      isFeatured: item.isFeatured || false,
      isPublished: item.isPublished || false,
      showOnHomepage: item.showOnHomepage ?? true,
      registrationOpen: item.registrationOpen ?? true,
      liveMatchToggle: item.liveMatchToggle || false,
      communityEnabled: item.community?.enabled || false,
      communityAccessType: item.community?.accessType || 'WHATSAPP',
      communityInviteLink: item.community?.inviteLink || '',
      communityName: item.community?.communityName || '',
      communityDescription: item.community?.communityDescription || '',
      hideInviteLinkFromPublic: item.community?.hideInviteLinkFromPublic ?? true,
      communityUnlockMode: item.community?.unlockMode || 'SLOT_PURCHASE_ONLY',
      communityIsDisabled: item.community?.isDisabled || false,
      notifyOnPublish: false,
    });
    setValidationErrors({});
    setFeedback('');
    void loadCommunityUsers(item.id);
    setModalOpen(true);
  };

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>, key: 'bannerImage' | 'thumbnailImage' | 'logoImage') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setForm((prev) => ({ ...prev, [key]: compressed }));
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const compressed = await Promise.all(files.map((file) => compressImage(file)));
    setForm((prev) => ({ ...prev, galleryImages: [...prev.galleryImages, ...compressed] }));
  };

  const compressImage = (file: File) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 1200;
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const context = canvas.getContext('2d');
          context?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/webp', 0.8));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    if (!form.title.trim() || form.title.trim().length < 3) {
      errors.title = 'Tournament name must be at least 3 characters.';
    }
    if (!form.description.trim() || form.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters.';
    }
    if (form.entryFee < 0) {
      errors.entryFee = 'Entry fee cannot be negative.';
    }
    if (form.prizePool < 0) {
      errors.prizePool = 'Prize pool cannot be negative.';
    }
    if (form.maxTeams < 2) {
      errors.maxTeams = 'Max teams must be at least 2.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    if (!validateForm()) {
      setFeedbackTone('error');
      setFeedback('Please fix the validation errors before saving.');
      return;
    }

    setFeedback('');
    setFeedbackTone('success');
    setIsSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      banner: form.bannerImage || undefined,
      mode: form.mode,
      format: form.format,
      entryFee: form.entryFee,
      prizePool: form.prizePool,
      firstPrize: form.firstPrize,
      secondPrize: form.secondPrize,
      thirdPrize: form.thirdPrize,
      perKillPrize: form.perKillPrize,
      maxTeams: form.maxTeams,
      rules: 'Standard tournament rules apply.',
      roomId: form.roomId.trim(),
      roomPassword: form.roomPassword.trim(),
      roomEnabled: form.roomEnabled,
      roomReleaseTime: form.roomReleaseTime ? new Date(form.roomReleaseTime).toISOString() : undefined,
      status: form.status,
      tournamentStart: form.tournamentStart ? new Date(form.tournamentStart).toISOString() : undefined,
      tournamentEnd: form.tournamentEnd ? new Date(form.tournamentEnd).toISOString() : undefined,
      registrationStart: form.registrationStart ? new Date(form.registrationStart).toISOString() : undefined,
      registrationEnd: form.registrationEnd ? new Date(form.registrationEnd).toISOString() : undefined,
      timeZone: form.timeZone,
      isPaused: form.isPaused,
      bannerImage: form.bannerImage || undefined,
      thumbnailImage: form.thumbnailImage || undefined,
      logoImage: form.logoImage || undefined,
      galleryImages: form.galleryImages,
      isFeatured: form.isFeatured,
      isPublished: form.isPublished,
      showOnHomepage: form.showOnHomepage,
      registrationOpen: form.registrationOpen,
      liveMatchToggle: form.liveMatchToggle,
      community: {
        enabled: form.communityEnabled,
        accessType: form.communityAccessType,
        inviteLink: form.communityInviteLink.trim(),
        communityName: form.communityName.trim(),
        communityDescription: form.communityDescription.trim(),
        hideInviteLinkFromPublic: form.hideInviteLinkFromPublic,
        unlockMode: form.communityUnlockMode,
        isDisabled: form.communityIsDisabled,
      },
    };

    try {
      const endpoint = editingId ? `/api/admin/tournaments/${editingId}` : '/api/admin/tournaments';
      const method = editingId ? 'PATCH' : 'POST';
      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({ message: 'Unexpected server response.' }));

      if (!response.ok) {
        setFeedbackTone('error');
        setFeedback(result.message || 'Unable to save tournament. Please try again.');
        return;
      }

      if (response.ok && form.notifyOnPublish && !editingId) {
        const { db } = await import('@/lib/db');
        db.createAnnouncement({
          title: `🔥 New Tournament: ${form.title}`,
          content: `Registration is now open for ${form.title}. Prize Pool: ৳${form.prizePool}. Join now!`,
          category: 'TOURNAMENT',
          isPinned: true,
          link: `/tournaments/${result.tournament?.id || ''}`,
          imageUrl: form.bannerImage || undefined,
        });
      }

      setFeedbackTone('success');
      setFeedback(editingId ? 'Tournament updated successfully.' : 'Tournament created successfully.');
      await loadTournaments();
      setTimeout(() => resetForm(), 1200);
    } catch (err: any) {
      setFeedbackTone('error');
      setFeedback(err?.message || 'Network error. Could not reach the server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAction = async (id: string, updates: Partial<Tournament>) => {
    const response = await fetch(`/api/admin/tournaments/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(updates),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      await loadTournaments();
      setFeedback('Tournament updated.');
      setFeedbackTone('success');
    } else {
      setFeedback(result.message || 'Failed to update tournament.');
      setFeedbackTone('error');
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/tournaments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'x-csrf-token': csrfToken },
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      await loadTournaments();
      setFeedback('Tournament removed.');
      setFeedbackTone('success');
    } else {
      setFeedback(result.message || 'Failed to delete tournament.');
      setFeedbackTone('error');
    }
  };

  const duplicateTournament = async (item: Tournament) => {
    const duplicatePayload = {
      title: `${item.title} (Copy)`,
      description: item.description,
      mode: item.mode,
      format: item.format,
      entryFee: item.entryFee,
      prizePool: item.prizePool,
      firstPrize: item.firstPrize,
      secondPrize: item.secondPrize,
      thirdPrize: item.thirdPrize,
      perKillPrize: item.perKillPrize,
      maxTeams: item.maxTeams,
      status: 'DRAFT' as TournamentStatus,
      roomId: undefined,
      roomPassword: undefined,
      bannerImage: item.bannerImage || undefined,
      thumbnailImage: item.thumbnailImage || undefined,
      logoImage: item.logoImage || undefined,
      galleryImages: item.galleryImages || [],
      isFeatured: false,
      isPublished: false,
      showOnHomepage: true,
      registrationOpen: true,
      liveMatchToggle: false,
      community: {
        enabled: false,
        accessType: 'WHATSAPP' as const,
        inviteLink: '',
        communityName: '',
        communityDescription: '',
        hideInviteLinkFromPublic: true,
        unlockMode: 'SLOT_PURCHASE_ONLY' as const,
        isDisabled: false,
      },
    };
    const response = await fetch('/api/admin/tournaments', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(duplicatePayload),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      await loadTournaments();
      setFeedback('Tournament duplicated.');
      setFeedbackTone('success');
    } else {
      setFeedback(result.message || 'Failed to duplicate.');
      setFeedbackTone('error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800/80 bg-[#111827]/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-brand-red font-bold">Secure Tournament Operations</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-heading font-black text-white">TOURNAMENT CONTROL CENTER</h1>
            <p className="mt-1 text-xs text-slate-400">Create, edit, publish, feature, duplicate, and manage tournament slot brackets.</p>
          </div>
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange px-5 py-3 font-heading font-black text-xs text-white shadow-neon-red hover:brightness-110 transition-all">
            <PlusCircle className="h-4 w-4" /> CREATE TOURNAMENT
          </button>
        </div>

        {feedback ? <div className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold ${feedbackTone === 'error' ? 'border-red-900/50 bg-red-950/40 text-red-300' : 'border-emerald-900/50 bg-emerald-950/40 text-emerald-300'}`}>{feedback}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-bold">Total Competitions</p>
            <p className="mt-1 text-2xl font-heading font-black text-white">{tournaments.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-bold">Live & Published</p>
            <p className="mt-1 text-2xl font-heading font-black text-emerald-400">{tournaments.filter((item) => item.isPublished || item.status === 'LIVE').length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-bold">Featured Hubs</p>
            <p className="mt-1 text-2xl font-heading font-black text-brand-gold">{tournaments.filter((item) => item.isFeatured).length}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white shadow-sm focus-within:border-brand-red">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tournaments..." className="w-full bg-transparent outline-none text-white placeholder-slate-500 font-medium" />
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white shadow-sm focus-within:border-brand-red">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TournamentStatus)} className="bg-transparent outline-none text-white font-bold">
              {statusOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-900 text-white">
                  {option === 'ALL' ? 'All Statuses' : option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/90 text-slate-400 text-xs uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-4">Tournament</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Prize Pool</th>
                <th className="px-4 py-4">Visibility</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-slate-500 text-center">Loading tournament database...</td></tr>
              ) : filteredTournaments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-slate-500 text-center">No tournaments match your search filter.</td></tr>
              ) : filteredTournaments.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red border border-brand-red/20">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{item.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{item.mode} • {item.format.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase text-slate-300">{item.status}</span>
                  </td>
                  <td className="px-4 py-4 font-heading font-black text-brand-gold text-base">৳{item.prizePool}</td>
                  <td className="px-4 py-4">
                    {item.isFeatured ? <span className="mr-2 inline-flex items-center gap-1 rounded-lg bg-orange-950/50 border border-orange-800/40 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-400"><Star className="h-3 w-3" /> Featured</span> : null}
                    {item.isPublished ? <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400"><Sparkles className="h-3 w-3" /> Published</span> : null}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button onClick={() => openEditModal(item)} className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => void handleQuickAction(item.id, { status: item.status === 'LIVE' ? 'UPCOMING' : 'LIVE', isPublished: true })} className="rounded-xl border border-emerald-800/50 bg-emerald-950/50 px-2.5 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900 transition-colors">Publish</button>
                      <button onClick={() => void handleQuickAction(item.id, { isFeatured: !item.isFeatured })} className="rounded-xl border border-orange-800/50 bg-orange-950/50 px-2.5 py-1.5 text-xs font-bold text-orange-400 hover:bg-orange-900 transition-colors">Feature</button>
                      <button onClick={() => void duplicateTournament(item)} className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"><Copy className="mr-1 h-3 w-3 inline" /> Copy</button>
                      <button onClick={() => void handleDelete(item.id)} className="rounded-xl border border-red-900/50 bg-red-950/50 px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900 transition-colors"><Trash2 className="mr-1 h-3 w-3 inline" /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-brand-red font-bold">Tournament Configuration</p>
                <h2 className="mt-1 text-2xl font-heading font-black text-white">{editingId ? 'Edit Tournament' : 'Create Tournament'}</h2>
              </div>
              <button onClick={resetForm} className="rounded-2xl border border-slate-800 p-2 text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {feedback ? <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${feedbackTone === 'error' ? 'border-red-500/20 bg-red-50 text-red-600' : 'border-emerald-500/20 bg-emerald-50 text-emerald-600'}`}>{feedback}</div> : null}

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Tournament Name <span className="text-red-500">*</span></label>
                  <input required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={`w-full rounded-2xl border bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none ${validationErrors.title ? 'border-red-500' : 'border-slate-300'}`} />
                  {validationErrors.title && <p className="mt-1 text-xs text-red-500">{validationErrors.title}</p>}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between"><label className="block text-sm font-medium text-slate-700">Tournament Description <span className="text-red-500">*</span></label><button type="button" onClick={() => setDescriptionHtmlMode(value => !value)} className="text-xs font-medium text-blue-600 hover:text-blue-700">{descriptionHtmlMode ? 'Use visual editor' : 'Edit HTML / tables'}</button></div>
                  <ReactQuill theme="snow" modules={{ toolbar: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image', 'video']] }} value={form.description} onChange={(val) => setForm((prev) => ({ ...prev, description: val }))} className={`bg-white text-slate-900 [&_.ql-toolbar]:border-slate-300 [&_.ql-container]:border-slate-300 [&_.ql-toolbar]:rounded-t-2xl [&_.ql-container]:rounded-b-2xl ${validationErrors.description ? '[&_.ql-container]:border-red-500' : ''}`} />
                  {validationErrors.description && <p className="mt-1 text-xs text-red-500">{validationErrors.description}</p>}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Game Mode</label>
                    <select value={form.mode} onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value as Mode }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none">
                      <option value="SOLO">SOLO</option>
                      <option value="DUO">DUO</option>
                      <option value="SQUAD">SQUAD</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Match Type</label>
                    <select value={form.format} onChange={(event) => setForm((prev) => ({ ...prev, format: event.target.value as Format }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none">
                      <option value="BR_RANKED">BR RANKED</option>
                      <option value="CS_RANKED">CS RANKED</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Entry Fee</label>
                    <input type="number" min="0" value={form.entryFee} onChange={(event) => setForm((prev) => ({ ...prev, entryFee: Number(event.target.value) }))} className={`w-full rounded-2xl border bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none ${validationErrors.entryFee ? 'border-red-500' : 'border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Prize Pool</label>
                    <input type="number" min="0" value={form.prizePool} onChange={(event) => setForm((prev) => ({ ...prev, prizePool: Number(event.target.value) }))} className={`w-full rounded-2xl border bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none ${validationErrors.prizePool ? 'border-red-500' : 'border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Max Teams</label>
                    <input type="number" min="2" value={form.maxTeams} onChange={(event) => setForm((prev) => ({ ...prev, maxTeams: Number(event.target.value) }))} className={`w-full rounded-2xl border bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none ${validationErrors.maxTeams ? 'border-red-500' : 'border-slate-300'}`} />
                  </div>
                </div>
                {/* Prize Distribution */}
                <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                  <p className="mb-4 text-xs uppercase tracking-[0.2em] font-bold text-slate-500">Prize Distribution</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">1st Prize (৳)</label>
                      <input type="number" min="0" value={form.firstPrize} onChange={(event) => setForm((prev) => ({ ...prev, firstPrize: Number(event.target.value) }))} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">2nd Prize (৳)</label>
                      <input type="number" min="0" value={form.secondPrize} onChange={(event) => setForm((prev) => ({ ...prev, secondPrize: Number(event.target.value) }))} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">3rd Prize (৳)</label>
                      <input type="number" min="0" value={form.thirdPrize} onChange={(event) => setForm((prev) => ({ ...prev, thirdPrize: Number(event.target.value) }))} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">Per Kill Prize (৳)</label>
                      <input type="number" min="0" value={form.perKillPrize} onChange={(event) => setForm((prev) => ({ ...prev, perKillPrize: Number(event.target.value) }))} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-300" />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Tournament Start Date & Time</label>
                    <input type="datetime-local" value={form.tournamentStart} onChange={(e) => setForm((prev) => ({ ...prev, tournamentStart: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Tournament End Date & Time</label>
                    <input type="datetime-local" value={form.tournamentEnd} onChange={(e) => setForm((prev) => ({ ...prev, tournamentEnd: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Registration Start</label>
                    <input type="datetime-local" value={form.registrationStart} onChange={(e) => setForm((prev) => ({ ...prev, registrationStart: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Registration End</label>
                    <input type="datetime-local" value={form.registrationEnd} onChange={(e) => setForm((prev) => ({ ...prev, registrationEnd: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Time Zone</label>
                    <input value={form.timeZone} onChange={(e) => setForm((prev) => ({ ...prev, timeZone: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" placeholder="Asia/Dhaka" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Pause Tournament</h4>
                      <p className="text-xs text-slate-500">Suspend and hide tournament</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked={form.isPaused} onChange={(event) => setForm((prev) => ({ ...prev, isPaused: event.target.checked }))} className="peer sr-only" />
                      <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Status Override</label>
                    <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as TournamentStatus }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none">
                      {statusOptions.filter((option) => option !== 'ALL' && option !== 'UPCOMING' && option !== 'LIVE' && option !== 'FINISHED').map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">Upcoming, Live, and Completed are set automatically by schedule.</p>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Enable Room</h4>
                      <p className="text-xs text-slate-500">Turn on to set room details</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked={form.roomEnabled} onChange={(event) => setForm((prev) => ({ ...prev, roomEnabled: event.target.checked }))} className="peer sr-only" />
                      <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                    </label>
                  </div>
                  {form.roomEnabled && (
                    <>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Room ID</label>
                        <input value={form.roomId} onChange={(event) => setForm((prev) => ({ ...prev, roomId: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Room Password</label>
                        <input value={form.roomPassword} onChange={(event) => setForm((prev) => ({ ...prev, roomPassword: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-700">Room Release Time</label>
                        <input type="datetime-local" value={form.roomReleaseTime} onChange={(event) => setForm((prev) => ({ ...prev, roomReleaseTime: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" />
                        <p className="mt-1 text-xs text-slate-500">Before this time, the room info will be locked for verified users.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Banner Image</label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-3 py-6 text-sm text-slate-500 hover:border-red-300 hover:bg-red-50 transition-colors">
                    <UploadCloud className="h-5 w-5" /> Upload Banner
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(event) => void handleFilePick(event, 'bannerImage')} />
                  </label>
                  {form.bannerImage ? <img src={form.bannerImage} alt="Banner preview" className="mt-3 h-32 w-full rounded-2xl object-cover shadow-sm border border-slate-200" /> : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Thumbnail</label>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500 hover:border-red-300 hover:bg-red-50 transition-colors">
                      <UploadCloud className="h-4 w-4" /> Upload
                      <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(event) => void handleFilePick(event, 'thumbnailImage')} />
                    </label>
                    {form.thumbnailImage ? <img src={form.thumbnailImage} alt="Thumbnail preview" className="mt-3 h-20 w-full rounded-2xl object-cover shadow-sm border border-slate-200" /> : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Logo</label>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500 hover:border-red-300 hover:bg-red-50 transition-colors">
                      <UploadCloud className="h-4 w-4" /> Upload
                      <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(event) => void handleFilePick(event, 'logoImage')} />
                    </label>
                    {form.logoImage ? <img src={form.logoImage} alt="Logo preview" className="mt-3 h-20 w-full rounded-2xl object-cover shadow-sm border border-slate-200" /> : null}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Additional Gallery Images</label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500 hover:border-red-300 hover:bg-red-50 transition-colors">
                    <UploadCloud className="h-4 w-4" /> Upload multiple images
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" multiple onChange={(event) => void handleGalleryUpload(event)} />
                  </label>
                  {form.galleryImages.length ? <div className="mt-3 flex flex-wrap gap-2">{form.galleryImages.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Gallery ${index + 1}`} className="h-16 w-16 rounded-2xl object-cover shadow-sm border border-slate-200" />)}</div> : null}
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Private Community Access</div>
                      <div className="text-xs text-slate-500 mt-1">Keep the invite link hidden from public HTML until the right conditions are met.</div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked={form.communityEnabled} onChange={(event) => setForm((prev) => ({ ...prev, communityEnabled: event.target.checked }))} className="peer sr-only" />
                      <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                    </label>
                  </div>
                  {form.communityEnabled ? (
                    <div className="space-y-4 pt-3 border-t border-slate-100 mt-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Private Group Type</label>
                        <select value={form.communityAccessType} onChange={(event) => setForm((prev) => ({ ...prev, communityAccessType: event.target.value as any }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none">
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="DISCORD">Discord</option>
                          <option value="TELEGRAM">Telegram</option>
                          <option value="FACEBOOK_GROUP">Facebook Group</option>
                          <option value="MESSENGER_GROUP">Messenger Group</option>
                          <option value="CUSTOM_LINK">Custom Link</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Private Group Invite Link</label>
                        <input value={form.communityInviteLink} onChange={(event) => setForm((prev) => ({ ...prev, communityInviteLink: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Community Name</label>
                        <input value={form.communityName} onChange={(event) => setForm((prev) => ({ ...prev, communityName: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Community Description</label>
                        <textarea rows={3} value={form.communityDescription} onChange={(event) => setForm((prev) => ({ ...prev, communityDescription: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none" />
                      </div>
                      <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"><span>Hide Invite Link from Public</span><input type="checkbox" className="h-4 w-4 accent-red-500 rounded border-slate-300" checked={form.hideInviteLinkFromPublic} onChange={(event) => setForm((prev) => ({ ...prev, hideInviteLinkFromPublic: event.target.checked }))} /></label>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">Automatically Unlock Invite Link After</label>
                        <select value={form.communityUnlockMode} onChange={(event) => setForm((prev) => ({ ...prev, communityUnlockMode: event.target.value as any }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none">
                          <option value="SLOT_PURCHASE_ONLY">Slot Purchase Only</option>
                          <option value="PAYMENT_VERIFICATION_ONLY">Payment Verification Only</option>
                          <option value="ADMIN_APPROVAL_ONLY">Admin Approval Only</option>
                        </select>
                      </div>
                      <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"><span>Disable Community Link</span><input type="checkbox" className="h-4 w-4 accent-red-500 rounded border-slate-300" checked={form.communityIsDisabled} onChange={(event) => setForm((prev) => ({ ...prev, communityIsDisabled: event.target.checked }))} /></label>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
                        <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                          <span>Unlocked users</span>
                          <span className="font-bold text-emerald-600">{communityUsers.length}</span>
                        </div>
                        {communityUsersLoading ? <div className="mt-2 text-xs text-slate-500">Loading access list…</div> : communityUsers.length === 0 ? <div className="mt-2 text-xs text-slate-500">No users have unlocked this community yet.</div> : (
                          <div className="mt-3 space-y-2">
                            {communityUsers.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                                <div>
                                  <div className="font-semibold text-slate-900">{entry.userName}</div>
                                  <div className="text-[11px] text-slate-500">{entry.userEmail}</div>
                                </div>
                                <button type="button" onClick={() => void handleRevokeCommunityAccess(entry.userId)} className="rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-colors">Revoke</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:border-red-200"><span>Featured</span><input type="checkbox" className="h-4 w-4 accent-red-500 rounded border-slate-300" checked={form.isFeatured} onChange={(event) => setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))} /></label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:border-red-200"><span>Published</span><input type="checkbox" className="h-4 w-4 accent-red-500 rounded border-slate-300" checked={form.isPublished} onChange={(event) => setForm((prev) => ({ ...prev, isPublished: event.target.checked }))} /></label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:border-red-200"><span>Show on Homepage</span><input type="checkbox" className="h-4 w-4 accent-red-500 rounded border-slate-300" checked={form.showOnHomepage} onChange={(event) => setForm((prev) => ({ ...prev, showOnHomepage: event.target.checked }))} /></label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm cursor-pointer hover:border-red-200"><span>Registration Open</span><input type="checkbox" className="h-4 w-4 accent-red-500 rounded border-slate-300" checked={form.registrationOpen} onChange={(event) => setForm((prev) => ({ ...prev, registrationOpen: event.target.checked }))} /></label>
                </div>
                {!editingId && (
                  <label className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 text-sm font-semibold text-orange-700 shadow-sm cursor-pointer">
                    <span>Notify All Users (Send Broadcast)</span>
                    <input type="checkbox" checked={form.notifyOnPublish} onChange={(event) => setForm((prev) => ({ ...prev, notifyOnPublish: event.target.checked }))} className="h-5 w-5 accent-orange-500 rounded" />
                  </label>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetForm} disabled={isSaving} className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50">Cancel</button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      'Save Tournament'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
