'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AlertCircle, CheckCircle2, Coins, Copy, Eye, Filter, Loader2, Plus, PlusCircle, Search, ShieldCheck, Sparkles, Star, Trash2, Trophy, UploadCloud, X, MessageSquare, Send } from 'lucide-react';
import { Tournament, Mode, Format, TournamentStatus, CommunityAccessType, CommunityUnlockMode, PrizeTier } from '@/lib/types';
import ImageUploadInput from '@/components/ui/ImageUploadInput';
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
  game: string;
  gameName: string;
  mode: Mode;
  format: Format;
  entryFee: number;
  prizePool: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  perKillPrize: number;
  prizeDistribution: PrizeTier[];
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
  allowCoinEntry: boolean;
  coinEntryFee: number;
  entryFeeType: 'CASH' | 'COINS' | 'BOTH' | 'FREE';
  isGiveaway: boolean;
  requiresFullSquad: boolean;
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
  game: 'FREE_FIRE',
  gameName: 'Free Fire',
  mode: 'SQUAD' as Mode,
  format: 'BR_RANKED' as Format,
  entryFee: 100,
  prizePool: 4000,
  firstPrize: 2000,
  secondPrize: 1000,
  thirdPrize: 500,
  perKillPrize: 10,
  prizeDistribution: [
    { rank: 1, label: '1st Place (Champion)', prize: 2000 },
    { rank: 2, label: '2nd Place (Runner-up)', prize: 1000 },
    { rank: 3, label: '3rd Place', prize: 500 },
  ],
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
  allowCoinEntry: true,
  coinEntryFee: 1000,
  entryFeeType: 'BOTH',
  isGiveaway: false,
  requiresFullSquad: false,
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
  const [gameFilter, setGameFilter] = useState<string>('ALL');
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
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isBroadcastingWhatsapp, setIsBroadcastingWhatsapp] = useState(false);

  const handleBroadcastRoomWhatsapp = async () => {
    if (!editingId) return;
    if (!form.roomId.trim() || !form.roomPassword.trim()) {
      setFeedbackTone('error');
      setFeedback('Please enter both Room ID and Room Password before broadcasting.');
      return;
    }
    if (!confirm(`Broadcast Room ID (${form.roomId}) and Password (${form.roomPassword}) to all verified registered players of "${form.title}" via WhatsApp?`)) {
      return;
    }
    setIsBroadcastingWhatsapp(true);
    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'BROADCAST',
          tournamentId: editingId,
          tournamentTitle: form.title,
          roomId: form.roomId.trim(),
          pass: form.roomPassword.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackTone('success');
        setFeedback(data.message || 'WhatsApp Room ID broadcast successfully sent to players!');
      } else {
        setFeedbackTone('error');
        setFeedback(data.message || 'Failed to broadcast WhatsApp message.');
      }
    } catch (err: any) {
      setFeedbackTone('error');
      setFeedback(err?.message || 'Network error broadcasting WhatsApp message.');
    } finally {
      setIsBroadcastingWhatsapp(false);
    }
  };


  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/generate-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          game: form.game,
          mode: form.mode,
          format: form.format,
          prizePool: form.prizePool,
          entryFee: form.entryFee,
        }),
      });

      const data = await res.json();
      if (res.ok && data.description) {
        const rulesHtml = data.rules ? `<h3>📜 Official Rules:</h3><p>${data.rules.replace(/\n/g, '<br/>')}</p>` : '';
        setForm(prev => ({
          ...prev,
          description: `<p>${data.description.replace(/\n/g, '<br/>')}</p>${rulesHtml ? `<br/>${rulesHtml}` : ''}`
        }));
        setFeedback('✨ AI successfully generated tournament description & rules!');
        setFeedbackTone('success');
      } else {
        setFeedback(data.message || 'Failed to generate content with AI');
        setFeedbackTone('error');
      }
    } catch {
      setFeedback('Error connecting to Gemini AI generator.');
      setFeedbackTone('error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  useEffect(() => {
    const cookie = document.cookie.split('; ').find((item) => item.startsWith('admin_csrf='));
    setCsrfToken(cookie?.split('=')[1] || '');
    void loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tournaments', { credentials: 'include' });
      if (response.ok) {
        const payload = await response.json();
        setTournaments(payload.tournaments || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((item) => {
      const matchesSearch = `${item.title} ${item.description} ${item.gameName || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      let matchesGame = true;
      if (gameFilter !== 'ALL') {
        const g = (item.game || '').toUpperCase();
        const title = item.title.toLowerCase();
        if (gameFilter === 'FREE_FIRE') {
          matchesGame = g === 'FREE_FIRE' || title.includes('free fire') || g === '';
        } else if (gameFilter === 'EFOOTBALL') {
          matchesGame = g === 'EFOOTBALL' || title.includes('efootball') || title.includes('pes');
        } else if (gameFilter === 'PUBG_MOBILE') {
          matchesGame = g === 'PUBG_MOBILE' || title.includes('pubg') || title.includes('bgmi');
        } else if (gameFilter === 'VALORANT') {
          matchesGame = g === 'VALORANT' || title.includes('valorant');
        } else if (gameFilter === 'MLBB') {
          matchesGame = g === 'MLBB' || title.includes('mobile legends') || title.includes('mlbb');
        } else if (gameFilter === 'COD_MOBILE') {
          matchesGame = g === 'COD_MOBILE' || title.includes('cod') || title.includes('call of duty');
        } else if (gameFilter === 'LUDO_KING') {
          matchesGame = g === 'LUDO_KING' || title.includes('ludo');
        }
      }
      return matchesSearch && matchesStatus && matchesGame;
    });
  }, [search, statusFilter, gameFilter, tournaments]);

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

  const setPrizePreset = (count: number) => {
    const total = form.prizePool || 1000;
    const presets: Record<number, number[]> = {
      1: [1.0],
      3: [0.5, 0.3, 0.2],
      5: [0.4, 0.25, 0.15, 0.1, 0.1],
      8: [0.35, 0.2, 0.15, 0.1, 0.08, 0.05, 0.04, 0.03],
      10: [0.3, 0.2, 0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.03, 0.03],
    };

    const ratios = presets[count] || Array(count).fill(1 / count);
    const newTiers: PrizeTier[] = ratios.map((ratio, idx) => {
      const rank = idx + 1;
      const label =
        rank === 1 ? '1st Place (Champion)' :
        rank === 2 ? '2nd Place (Runner-up)' :
        rank === 3 ? '3rd Place' :
        `${rank}th Place`;
      return {
        rank,
        label,
        prize: Math.round(total * ratio),
      };
    });

    setForm(prev => ({
      ...prev,
      prizeDistribution: newTiers,
      firstPrize: newTiers[0]?.prize || 0,
      secondPrize: newTiers[1]?.prize || 0,
      thirdPrize: newTiers[2]?.prize || 0,
    }));
  };

  const addPrizeTier = () => {
    setForm(prev => {
      const current = prev.prizeDistribution || [];
      const nextRank = current.length + 1;
      const newTier: PrizeTier = {
        rank: nextRank,
        label: `${nextRank}th Place`,
        prize: 0,
      };
      const updated = [...current, newTier];
      return {
        ...prev,
        prizeDistribution: updated,
      };
    });
  };

  const removePrizeTier = (index: number) => {
    setForm(prev => {
      const current = prev.prizeDistribution || [];
      const updated = current.filter((_, idx) => idx !== index).map((tier, idx) => ({
        ...tier,
        rank: idx + 1,
      }));
      return {
        ...prev,
        prizeDistribution: updated,
        firstPrize: updated[0]?.prize || 0,
        secondPrize: updated[1]?.prize || 0,
        thirdPrize: updated[2]?.prize || 0,
      };
    });
  };

  const updatePrizeTier = (index: number, field: 'label' | 'prize', value: string | number) => {
    setForm(prev => {
      const current = [...(prev.prizeDistribution || [])];
      if (!current[index]) return prev;
      current[index] = {
        ...current[index],
        [field]: field === 'prize' ? Number(value) : String(value),
      };
      return {
        ...prev,
        prizeDistribution: current,
        firstPrize: current[0]?.prize || 0,
        secondPrize: current[1]?.prize || 0,
        thirdPrize: current[2]?.prize || 0,
      };
    });
  };

  const openEditModal = (item: Tournament) => {
    setEditingId(item.id);
    const defaultTiers: PrizeTier[] = [
      { rank: 1, label: '1st Place (Champion)', prize: item.firstPrize || Math.round((item.prizePool || 0) * 0.5) || 2000 },
      ...(item.secondPrize || (item.prizePool && item.prizePool > 0) ? [{ rank: 2, label: '2nd Place (Runner-up)', prize: item.secondPrize || Math.round((item.prizePool || 0) * 0.3) || 1000 }] : []),
      ...(item.thirdPrize || (item.prizePool && item.prizePool > 0) ? [{ rank: 3, label: '3rd Place', prize: item.thirdPrize || Math.round((item.prizePool || 0) * 0.2) || 500 }] : []),
    ];
    const initialDistribution = (item.prizeDistribution && item.prizeDistribution.length > 0)
      ? item.prizeDistribution
      : defaultTiers;

    setForm({
      title: item.title,
      description: item.description,
      game: item.game || 'FREE_FIRE',
      gameName: item.gameName || (item.game === 'EFOOTBALL' ? 'eFootball' : item.game === 'PUBG_MOBILE' ? 'PUBG Mobile' : item.game === 'VALORANT' ? 'Valorant' : 'Free Fire'),
      mode: item.mode,
      format: item.format,
      entryFee: item.entryFee,
      prizePool: item.prizePool,
      firstPrize: item.firstPrize,
      secondPrize: item.secondPrize,
      thirdPrize: item.thirdPrize,
      perKillPrize: item.perKillPrize,
      prizeDistribution: initialDistribution,
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
      allowCoinEntry: item.allowCoinEntry !== false,
      coinEntryFee: item.coinEntryFee !== undefined && item.coinEntryFee !== null ? Number(item.coinEntryFee) : (item.entryFee ? item.entryFee * 10 : 1000),
      entryFeeType: item.entryFeeType || (item.allowCoinEntry === false ? 'CASH' : (item.entryFee === 0 ? 'FREE' : 'BOTH')),
      isGiveaway: Boolean(item.isGiveaway || item.requiresFullSquad),
      requiresFullSquad: Boolean(item.requiresFullSquad || item.isGiveaway),
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

    const firstPrize = form.prizeDistribution?.[0]?.prize || form.firstPrize || 0;
    const secondPrize = form.prizeDistribution?.[1]?.prize || form.secondPrize || 0;
    const thirdPrize = form.prizeDistribution?.[2]?.prize || form.thirdPrize || 0;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      banner: form.bannerImage || undefined,
      game: form.game || 'FREE_FIRE',
      gameName: form.gameName || undefined,
      mode: form.mode,
      format: form.format,
      entryFee: form.entryFee,
      prizePool: form.prizePool,
      firstPrize,
      secondPrize,
      thirdPrize,
      perKillPrize: form.perKillPrize,
      prizeDistribution: form.prizeDistribution,
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
      isGiveaway: Boolean(form.isGiveaway || form.requiresFullSquad),
      requiresFullSquad: Boolean(form.requiresFullSquad || form.isGiveaway),
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
        try {
          await fetch('/api/admin/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              title: `🔥 New Tournament: ${form.title}`,
              message: `Registration is now open for ${form.title}. Prize Pool: ৳${form.prizePool}. Join now!`,
              targetGroup: 'ALL'
            }),
          });
        } catch {}
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
      game: item.game || 'FREE_FIRE',
      gameName: item.gameName || 'Free Fire',
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
            <p className="mt-1 text-xs text-slate-300 font-medium">Create, edit, publish, feature, duplicate, and manage multi-game esports tournaments.</p>
          </div>
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-red to-brand-orange px-5 py-3 font-heading font-black text-xs text-white shadow-neon-red hover:brightness-110 transition-all cursor-pointer">
            <PlusCircle className="h-4 w-4" /> CREATE TOURNAMENT
          </button>
        </div>

        {feedback ? <div className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-bold ${feedbackTone === 'error' ? 'border-red-900/50 bg-red-950/40 text-red-300' : 'border-emerald-900/50 bg-emerald-950/40 text-emerald-300'}`}>{feedback}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300 font-bold">Total Competitions</p>
            <p className="mt-1 text-2xl font-heading font-black text-white">{tournaments.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300 font-bold">Live & Published</p>
            <p className="mt-1 text-2xl font-heading font-black text-emerald-400">{tournaments.filter((item) => item.isPublished || item.status === 'LIVE').length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300 font-bold">Featured Hubs</p>
            <p className="mt-1 text-2xl font-heading font-black text-brand-gold">{tournaments.filter((item) => item.isFeatured).length}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white shadow-sm focus-within:border-brand-red">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tournaments or game..." className="w-full bg-transparent outline-none text-white placeholder-slate-400 font-medium" />
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white shadow-sm focus-within:border-brand-red">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)} className="bg-transparent outline-none text-white font-bold cursor-pointer">
              <option value="ALL" className="bg-slate-900 text-white">🎮 All Games</option>
              <option value="FREE_FIRE" className="bg-slate-900 text-white">🔥 Free Fire</option>
              <option value="EFOOTBALL" className="bg-slate-900 text-white">⚽ eFootball</option>
              <option value="PUBG_MOBILE" className="bg-slate-900 text-white">🪖 PUBG Mobile</option>
              <option value="VALORANT" className="bg-slate-900 text-white">🎯 Valorant</option>
              <option value="MLBB" className="bg-slate-900 text-white">⚔️ MLBB</option>
              <option value="COD_MOBILE" className="bg-slate-900 text-white">💥 COD Mobile</option>
              <option value="LUDO_KING" className="bg-slate-900 text-white">🎲 Ludo King</option>
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-white shadow-sm focus-within:border-brand-red">
            <Filter className="h-4 w-4 text-slate-400" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | TournamentStatus)} className="bg-transparent outline-none text-white font-bold cursor-pointer">
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
            <thead className="bg-slate-900/90 text-slate-300 text-xs uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-4">Tournament & Game</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Prize Pool</th>
                <th className="px-4 py-4">Visibility</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-slate-400 text-center">Loading tournament database...</td></tr>
              ) : filteredTournaments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-slate-400 text-center">No tournaments match your search filter.</td></tr>
              ) : filteredTournaments.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red border border-brand-red/20">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{item.title}</div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold text-brand-gold uppercase">
                            {item.game === 'EFOOTBALL' ? '⚽ eFootball' : item.game === 'PUBG_MOBILE' ? '🪖 PUBG' : item.game === 'VALORANT' ? '🎯 Valorant' : item.game === 'MLBB' ? '⚔️ MLBB' : item.gameName || '🔥 Free Fire'}
                          </span>
                          <span className="text-[11px] text-slate-300 font-mono font-medium">{item.mode} • {item.format.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-black uppercase text-slate-300">{item.status}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-heading font-black text-brand-gold text-sm">৳{item.prizePool.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                      {item.entryFeeType === 'FREE' || (item.entryFee === 0 && (!item.coinEntryFee || item.coinEntryFee === 0)) ? (
                        <span className="text-emerald-400">🎁 Free Entry</span>
                      ) : item.entryFeeType === 'COINS' ? (
                        <span className="text-amber-400">🪙 {item.coinEntryFee || (item.entryFee * 10) || 500} Coins</span>
                      ) : item.allowCoinEntry && item.entryFeeType === 'BOTH' ? (
                        <span className="text-slate-300">৳{item.entryFee} / {item.coinEntryFee || (item.entryFee * 10)} 🪙</span>
                      ) : (
                        <span className="text-slate-300">৳{item.entryFee} Cash Only</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {item.isFeatured ? <span className="mr-2 inline-flex items-center gap-1 rounded-lg bg-orange-950/50 border border-orange-800/40 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-400"><Star className="h-3 w-3" /> Featured</span> : null}
                    {item.isPublished ? <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400"><Sparkles className="h-3 w-3" /> Published</span> : null}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button onClick={() => openEditModal(item)} className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer">Edit</button>
                      <button onClick={() => void handleQuickAction(item.id, { status: item.status === 'LIVE' ? 'UPCOMING' : 'LIVE', isPublished: true })} className="rounded-xl border border-emerald-800/50 bg-emerald-950/50 px-2.5 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-900 transition-colors cursor-pointer">Publish</button>
                      <button onClick={() => void handleQuickAction(item.id, { isFeatured: !item.isFeatured })} className="rounded-xl border border-orange-800/50 bg-orange-950/50 px-2.5 py-1.5 text-xs font-bold text-orange-400 hover:bg-orange-900 transition-colors cursor-pointer">Feature</button>
                      <button onClick={() => void duplicateTournament(item)} className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"><Copy className="mr-1 h-3 w-3 inline" /> Copy</button>
                      <button onClick={() => void handleDelete(item.id)} className="rounded-xl border border-red-900/50 bg-red-950/50 px-2.5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900 transition-colors cursor-pointer"><Trash2 className="mr-1 h-3 w-3 inline" /> Delete</button>
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
                {/* Select Esports Game */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">Select Esports Game <span className="text-red-500">*</span></label>
                  <select 
                    value={form.game} 
                    onChange={(event) => {
                      const g = event.target.value;
                      const defaultName = 
                        g === 'FREE_FIRE' ? 'Free Fire' :
                        g === 'EFOOTBALL' ? 'eFootball' :
                        g === 'PUBG_MOBILE' ? 'PUBG Mobile' :
                        g === 'VALORANT' ? 'Valorant' :
                        g === 'MLBB' ? 'Mobile Legends' :
                        g === 'COD_MOBILE' ? 'COD Mobile' :
                        g === 'LUDO_KING' ? 'Ludo King' :
                        'Other Game';
                      setForm((prev) => ({ ...prev, game: g, gameName: defaultName }));
                    }} 
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 font-bold shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none cursor-pointer"
                  >
                    <option value="FREE_FIRE">🔥 Free Fire (Garena)</option>
                    <option value="EFOOTBALL">⚽ eFootball (Konami)</option>
                    <option value="PUBG_MOBILE">🪖 PUBG Mobile / BGMI</option>
                    <option value="VALORANT">🎯 Valorant (Riot Games)</option>
                    <option value="MLBB">⚔️ Mobile Legends (MLBB)</option>
                    <option value="COD_MOBILE">💥 Call of Duty: Mobile</option>
                    <option value="LUDO_KING">🎲 Ludo King</option>
                    <option value="OTHER">🏆 Other Custom Game</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Tournament Name <span className="text-red-500">*</span></label>
                  <input required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} className={`w-full rounded-2xl border bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none ${validationErrors.title ? 'border-red-500' : 'border-slate-300'}`} />
                  {validationErrors.title && <p className="mt-1 text-xs text-red-500">{validationErrors.title}</p>}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">Tournament Description <span className="text-red-500">*</span></label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateWithAI}
                        disabled={isGeneratingAI}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-orange border border-orange-200 text-xs font-bold transition-all disabled:opacity-50"
                        title="Auto-generate description & rules using Gemini AI"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : 'text-brand-orange'}`} />
                        <span>{isGeneratingAI ? 'Generating...' : '✨ AI Generate'}</span>
                      </button>
                      <button type="button" onClick={() => setDescriptionHtmlMode(value => !value)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                        {descriptionHtmlMode ? 'Use visual editor' : 'Edit HTML'}
                      </button>
                    </div>
                  </div>

                  <ReactQuill theme="snow" modules={{ toolbar: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image', 'video']] }} value={form.description} onChange={(val) => setForm((prev) => ({ ...prev, description: val }))} className={`bg-white text-slate-900 [&_.ql-toolbar]:border-slate-300 [&_.ql-container]:border-slate-300 [&_.ql-toolbar]:rounded-t-2xl [&_.ql-container]:rounded-b-2xl ${validationErrors.description ? '[&_.ql-container]:border-red-500' : ''}`} />
                  {validationErrors.description && <p className="mt-1 text-xs text-red-500">{validationErrors.description}</p>}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Game Mode</label>
                    <select value={form.mode} onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value as Mode }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none">
                      <option value="SOLO">SOLO (1v1)</option>
                      <option value="DUO">DUO (2v2)</option>
                      <option value="SQUAD">SQUAD (4v4 / 5v5)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Match Type</label>
                    <select value={form.format} onChange={(event) => setForm((prev) => ({ ...prev, format: event.target.value as Format }))} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none">
                      <option value="BR_RANKED">BR RANKED / Knockout</option>
                      <option value="CS_RANKED">CS RANKED / Custom Room</option>
                    </select>
                  </div>
                </div>
                {/* Currency & Payment Mode Management Box */}
                <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🪙</span>
                      <label className="text-xs font-black uppercase text-amber-950 font-heading">
                        Tournament Payment Currency Mode (কীভাবে এন্ট্রি ফি দেওয়া যাবে)
                      </label>
                    </div>
                    <span className="text-[11px] font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full uppercase">
                      {form.entryFeeType || 'BOTH'}
                    </span>
                  </div>

                  {/* 4 Currency Mode Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'BOTH', label: '🔄 Cash & Coins', desc: 'টাকা ও কয়েন উভয়টি' },
                      { id: 'CASH', label: '৳ Cash Only', desc: 'শুধু ওয়ালেট টাকা' },
                      { id: 'COINS', label: '🪙 Coins Only', desc: 'শুধু BRK কয়েন' },
                      { id: 'FREE', label: '🎁 Free Entry', desc: 'ফ্রি এন্ট্রি' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            entryFeeType: mode.id as any,
                            allowCoinEntry: mode.id === 'BOTH' || mode.id === 'COINS',
                            entryFee: mode.id === 'FREE' ? 0 : (prev.entryFee || 100),
                            coinEntryFee: mode.id === 'FREE' ? 0 : (prev.coinEntryFee || 1000),
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                          form.entryFeeType === mode.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-black'
                            : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-100/50'
                        }`}
                      >
                        <div>{mode.label}</div>
                        <div className="text-[10px] opacity-75 font-normal mt-0.5">{mode.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Detailed Currency Inputs */}
                  <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-amber-200/80">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">Cash Entry Fee (৳ BDT)</label>
                      <input
                        type="number"
                        min="0"
                        disabled={form.entryFeeType === 'COINS' || form.entryFeeType === 'FREE'}
                        value={form.entryFee}
                        onChange={(e) => setForm(prev => ({ ...prev, entryFee: Number(e.target.value) }))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-brand-orange disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-amber-800">
                        Coin Entry Fee (🪙 Coins Required)
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={form.entryFeeType === 'CASH' || form.entryFeeType === 'FREE'}
                        value={form.coinEntryFee}
                        onChange={(e) => setForm(prev => ({ ...prev, coinEntryFee: Number(e.target.value) }))}
                        placeholder="e.g. 500 or 1000 Coins"
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-900 outline-none focus:border-brand-orange disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Prize Pool (৳)</label>
                    <input type="number" min="0" value={form.prizePool} onChange={(event) => setForm((prev) => ({ ...prev, prizePool: Number(event.target.value) }))} className={`w-full rounded-2xl border bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none ${validationErrors.prizePool ? 'border-red-500' : 'border-slate-300'}`} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Max Teams / Slots</label>
                    <input type="number" min="2" value={form.maxTeams} onChange={(event) => setForm((prev) => ({ ...prev, maxTeams: Number(event.target.value) }))} className={`w-full rounded-2xl border bg-white px-3 py-3 text-slate-900 shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none ${validationErrors.maxTeams ? 'border-red-500' : 'border-slate-300'}`} />
                  </div>
                </div>
                {/* ── Dynamic Prize Distribution Manager ── */}
                <div className="rounded-2xl border border-slate-300 bg-white p-4 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] font-black text-slate-800 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>Prize Breakdown & Distribution</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Set custom prize amounts for Top 3, Top 5, Top 10, or any number of places.
                      </p>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Presets:</span>
                      {[
                        { count: 1, label: 'Top 1' },
                        { count: 3, label: 'Top 3' },
                        { count: 5, label: 'Top 5' },
                        { count: 8, label: 'Top 8' },
                        { count: 10, label: 'Top 10' },
                      ].map(preset => (
                        <button
                          key={preset.count}
                          type="button"
                          onClick={() => setPrizePreset(preset.count)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prize Tiers Rows */}
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {(form.prizeDistribution || []).map((tier, idx) => {
                      const medal = tier.rank === 1 ? '🥇' : tier.rank === 2 ? '🥈' : tier.rank === 3 ? '🥉' : '🎖️';
                      return (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-sm shrink-0 w-6 text-center">{medal}</span>
                          
                          <input
                            type="text"
                            value={tier.label}
                            onChange={(e) => updatePrizeTier(idx, 'label', e.target.value)}
                            placeholder={`e.g. ${idx + 1}th Place`}
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-brand-orange"
                          />

                          <div className="relative w-32 shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">৳</span>
                            <input
                              type="number"
                              min="0"
                              value={tier.prize}
                              onChange={(e) => updatePrizeTier(idx, 'prize', Number(e.target.value))}
                              placeholder="0"
                              className="w-full pl-6 pr-2.5 py-1.5 text-xs font-black text-slate-900 rounded-lg border border-slate-300 bg-white outline-none focus:border-brand-orange text-right"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removePrizeTier(idx)}
                            disabled={(form.prizeDistribution?.length || 0) <= 1}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Remove Position"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Tier & Per Kill Prize */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={addPrizeTier}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-orange border border-orange-200 text-xs font-black transition-all cursor-pointer w-fit"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Prize Position</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600 shrink-0">🎯 Per Kill Bounty:</label>
                      <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">৳</span>
                        <input
                          type="number"
                          min="0"
                          value={form.perKillPrize}
                          onChange={(e) => setForm(prev => ({ ...prev, perKillPrize: Number(e.target.value) }))}
                          className="w-full pl-5 pr-2 py-1 text-xs font-black text-rose-600 rounded-lg border border-slate-300 bg-white outline-none focus:border-brand-orange text-right"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Prize Calculation Bar */}
                  {(() => {
                    const totalAllocated = (form.prizeDistribution || []).reduce((acc, t) => acc + (Number(t.prize) || 0), 0);
                    const pool = Number(form.prizePool) || 0;
                    const diff = pool - totalAllocated;

                    return (
                      <div className="p-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-3">
                          <span>Pool: <strong className="text-brand-gold">৳{pool.toLocaleString()}</strong></span>
                          <span className="text-slate-500">•</span>
                          <span>Allocated: <strong className="text-emerald-400">৳{totalAllocated.toLocaleString()}</strong></span>
                        </div>

                        <div>
                          {diff === 0 ? (
                            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
                            </span>
                          ) : diff > 0 ? (
                            <span className="text-[11px] text-amber-400 font-bold">
                              Unallocated: ৳{diff.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[11px] text-red-400 font-bold">
                              Exceeds by ৳{Math.abs(diff).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
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

                      {editingId && form.roomId && form.roomPassword && (
                        <div className="col-span-1 md:col-span-2 pt-2">
                          <button
                            type="button"
                            onClick={handleBroadcastRoomWhatsapp}
                            disabled={isBroadcastingWhatsapp}
                            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isBroadcastingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                            <span>{isBroadcastingWhatsapp ? 'Broadcasting via WhatsApp...' : '📢 Broadcast Room ID & Pass to Players via WhatsApp'}</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <ImageUploadInput
                  label="Tournament Banner Image"
                  theme="light"
                  value={form.bannerImage}
                  onChange={(val) => setForm((prev) => ({ ...prev, bannerImage: val }))}
                  placeholder="https://... or upload banner from device"
                  helperText="High-res 16:9 banner • Auto-compressed to lightweight WebP"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <ImageUploadInput
                      label="Thumbnail Image"
                      theme="light"
                      value={form.thumbnailImage}
                      onChange={(val) => setForm((prev) => ({ ...prev, thumbnailImage: val }))}
                      placeholder="https://... or upload thumbnail"
                    />
                  </div>
                  <div className="min-w-0">
                    <ImageUploadInput
                      label="Logo Image"
                      theme="light"
                      value={form.logoImage}
                      onChange={(val) => setForm((prev) => ({ ...prev, logoImage: val }))}
                      placeholder="https://... or upload logo"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Additional Gallery Images</label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500 hover:border-red-300 hover:bg-red-50 transition-colors">
                    <UploadCloud className="h-4 w-4" /> Upload multiple images (Auto-compressed)
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
                {/* Special Giveaway / Squad Mode Toggle */}
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                        <span>🎁 Giveaway Tournament (Requires Full 4-Player Official Squad)</span>
                      </div>
                      <div className="text-xs text-amber-800/80 mt-0.5">
                        When enabled, players must have an official registered squad with at least 4 active members (IGL + 3 Players) to register.
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={form.isGiveaway || form.requiresFullSquad}
                        onChange={(event) => setForm((prev) => ({ ...prev, isGiveaway: event.target.checked, requiresFullSquad: event.target.checked }))}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                    </label>
                  </div>
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
