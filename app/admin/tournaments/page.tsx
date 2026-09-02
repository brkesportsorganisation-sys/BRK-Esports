'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AlertCircle, CheckCircle2, Coins, Copy, Eye, Filter, Loader2, Plus, PlusCircle, Search, ShieldCheck, Sparkles, Star, Trash2, Trophy, UploadCloud, X, MessageSquare, Send, Layers, UserCheck, Users, Play, ArrowUpRight, Lock, Unlock, Gamepad2, Award, Camera, Scan, CheckSquare, Save, RefreshCw, Calendar, Clock, MapPin, Tv, Edit3, ExternalLink } from 'lucide-react';
import { Tournament, Mode, Format, TournamentStatus, CommunityAccessType, CommunityUnlockMode, PrizeTier, TournamentBatchFormat, TournamentRoom, RoomQualifier, MatchTeamScore, TournamentPointsTable, TournamentRoadmapConfig, TournamentStage, TournamentRoadmapRuleItem } from '@/lib/types';
import { generateDefaultRoadmap, formatRoomLabel } from '@/lib/tournament-rooms-utils';
import { calculateTeamPoints } from '@/lib/ai-scoreboard-ocr';
import ImageUploadInput from '@/components/ui/ImageUploadInput';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const statusOptions: Array<'ALL' | TournamentStatus> = ['ALL', 'RUNNING', 'UPCOMING', 'PENDING', 'LIVE', 'FINISHED', 'CANCELLED'];

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
  tournamentBatchFormat: TournamentBatchFormat;
  roomCapacity: number;
  maxRooms: number | '';
  defaultAdvancementCount: number;
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
  tournamentBatchFormat: 'SINGLE_ROOM' as TournamentBatchFormat,
  roomCapacity: 12,
  maxRooms: '',
  defaultAdvancementCount: 3,
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

  // ─── Tournament Rooms Management State ─────────────────────────────────────
  const [selectedRoomTournament, setSelectedRoomTournament] = useState<Tournament | null>(null);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [tournamentRooms, setTournamentRooms] = useState<TournamentRoom[]>([]);
  const [roomQualifiers, setRoomQualifiers] = useState<RoomQualifier[]>([]);
  const [isRoomsLoading, setIsRoomsLoading] = useState(false);
  const [selectedAdvancingIds, setSelectedAdvancingIds] = useState<string[]>([]);
  const [advanceTargetRoomId, setAdvanceTargetRoomId] = useState<string>('');
  const [advanceTargetStageName, setAdvanceTargetStageName] = useState<string>('Grand Finals');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [roomActiveTab, setRoomActiveTab] = useState<'ROOMS' | 'ROADMAP' | 'ROSTER' | 'POINTS_TABLE' | 'QUALIFIERS'>('ROADMAP');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomEditForm, setRoomEditForm] = useState<{
    roomIdCredential: string;
    roomPassword: string;
    revealAt: string;
    isPublished: boolean;
    status: 'OPEN' | 'FULL' | 'LIVE' | 'COMPLETED';
    capacity: number;
    prizePool: number;
    matchTime: string;
    stageId: string;
    stageName: string;
    mapName: string;
    streamUrl: string;
    roomNotes: string;
  }>({
    roomIdCredential: '',
    roomPassword: '',
    revealAt: '',
    isPublished: false,
    status: 'OPEN',
    capacity: 12,
    prizePool: 0,
    matchTime: '',
    stageId: '',
    stageName: '',
    mapName: 'Bermuda',
    streamUrl: '',
    roomNotes: '',
  });

  // Roadmap & Schedule Studio State
  const [adminRoadmapConfig, setAdminRoadmapConfig] = useState<TournamentRoadmapConfig | null>(null);
  const [isRoadmapSaving, setIsRoadmapSaving] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageEditForm, setStageEditForm] = useState<{
    name: string;
    subtitle: string;
    status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
    matchTime: string;
    mapRotation: string;
    advancingPerGroup: number;
    streamUrl: string;
    customRules: string;
  }>({
    name: '',
    subtitle: '',
    status: 'UPCOMING',
    matchTime: '',
    mapRotation: 'Bermuda, Purgatory, Kalahari',
    advancingPerGroup: 3,
    streamUrl: '',
    customRules: '',
  });

  // Points Table & AI Scoreboard Studio State
  const [adminPointsTables, setAdminPointsTables] = useState<TournamentPointsTable[]>([]);
  const [selectedScoreboardRoomId, setSelectedScoreboardRoomId] = useState<string>('');
  const [selectedScoreboardStage, setSelectedScoreboardStage] = useState<string>('Round 1: Qualifiers');
  const [scoreboardImage, setScoreboardImage] = useState<string>('');
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [editableScores, setEditableScores] = useState<MatchTeamScore[]>([]);
  const [isSavingPointsTable, setIsSavingPointsTable] = useState(false);
  const [isBroadcastingPointsTable, setIsBroadcastingPointsTable] = useState<string | null>(null);
  const [matchNumberInput, setMatchNumberInput] = useState<number>(1);

  // Squad Roster Management State
  const [tournamentAllParticipants, setTournamentAllParticipants] = useState<any[]>([]);
  const [rosterFilterRoom, setRosterFilterRoom] = useState<string>('ALL');
  const [rosterSearchQuery, setRosterSearchQuery] = useState<string>('');
  const [isReassigningSquad, setIsReassigningSquad] = useState<string | null>(null);
  const [manualSquadModalOpen, setManualSquadModalOpen] = useState(false);
  const [manualSquadForm, setManualSquadForm] = useState({
    squadName: '',
    iglName: '',
    captainWhatsApp: '',
    player1Name: '',
    player2Name: '',
    player3Name: '',
    player4Name: '',
    roomId: '',
    roomLabel: '1',
    slotNumber: 1,
  });

  const loadPointsTablesData = async (tournamentId: string) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/results`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAdminPointsTables(data.pointsTables || []);
      }
    } catch (err) {}
  };

  const openRoomModal = async (tournament: Tournament, initialTab: 'ROOMS' | 'ROADMAP' | 'ROSTER' | 'POINTS_TABLE' | 'QUALIFIERS' = 'ROADMAP') => {
    setSelectedRoomTournament(tournament);
    setRoomModalOpen(true);
    setRoomActiveTab(initialTab);
    setEditingRoomId(null);
    setEditingStageId(null);
    setSelectedAdvancingIds([]);
    setScoreboardImage('');
    setEditableScores([]);
    setOcrConfidence(null);
    await Promise.all([
      loadTournamentRoomsData(tournament.id, tournament),
      loadPointsTablesData(tournament.id),
    ]);
  };

  const loadTournamentRoomsData = async (tournamentId: string, defaultTour?: Tournament | null) => {
    setIsRoomsLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rooms`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const loadedRooms = data.rooms || [];
        setTournamentRooms(loadedRooms);
        setRoomQualifiers(data.qualifiers || []);
        setTournamentAllParticipants(data.allParticipants || []);
        if (data.roadmap) {
          setAdminRoadmapConfig(data.roadmap);
        } else {
          setAdminRoadmapConfig(generateDefaultRoadmap(defaultTour || selectedRoomTournament || { id: tournamentId }, loadedRooms));
        }
        if (loadedRooms.length > 0 && !selectedScoreboardRoomId) {
          setSelectedScoreboardRoomId(loadedRooms[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load tournament rooms:', err);
    } finally {
      setIsRoomsLoading(false);
    }
  };

  const handleSaveRoadmap = async (customConfig?: TournamentRoadmapConfig) => {
    if (!selectedRoomTournament) return;
    const configToSave = customConfig || adminRoadmapConfig;
    if (!configToSave) return;
    setIsRoadmapSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          roadmapConfig: configToSave,
          roomsList: tournamentRooms,
        }),
      });
      if (res.ok) {
        setFeedbackTone('success');
        setFeedback('Tournament Roadmap & Stages saved successfully!');
        await loadTournamentRoomsData(selectedRoomTournament.id);
      } else {
        const err = await res.json();
        setFeedbackTone('error');
        setFeedback(err?.message || 'Failed to save roadmap');
      }
    } catch (err: any) {
      setFeedbackTone('error');
      setFeedback(err?.message || 'Failed to save roadmap');
    } finally {
      setIsRoadmapSaving(false);
    }
  };

  const handleAutoGenerateRoadmap = () => {
    if (!selectedRoomTournament) return;
    const generated = generateDefaultRoadmap(selectedRoomTournament, tournamentRooms);
    setAdminRoadmapConfig(generated);
    setFeedbackTone('success');
    setFeedback('Generated default multi-stage progression! Click "Save Roadmap" to publish.');
  };

  const handleAddStage = () => {
    if (!adminRoadmapConfig) return;
    const currentStages = adminRoadmapConfig.stages || [];
    const newStageNumber = currentStages.length + 1;
    const newStage: TournamentStage = {
      id: `STAGE_${Date.now()}`,
      stageNumber: newStageNumber,
      name: `Round ${newStageNumber}: ${newStageNumber === 1 ? 'Qualifiers' : newStageNumber === 2 ? 'Quarter-Finals' : 'Semi-Finals'}`,
      subtitle: `${tournamentRooms.length || 1} Groups • Top 3 Advance`,
      status: 'UPCOMING',
      mapRotation: ['Bermuda', 'Purgatory'],
      advancingPerGroup: 3,
      totalAdvancing: 12,
      customRules: 'Standard battle royale progression rules apply.',
    };
    const updated = {
      ...adminRoadmapConfig,
      stages: [...currentStages, newStage],
    };
    setAdminRoadmapConfig(updated);
  };

  const handleDeleteStage = (stageId: string) => {
    if (!adminRoadmapConfig) return;
    const updatedStages = (adminRoadmapConfig.stages || []).filter(s => s.id !== stageId);
    setAdminRoadmapConfig({ ...adminRoadmapConfig, stages: updatedStages });
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
    if (!adminRoadmapConfig) return;
    const mapArray = stageEditForm.mapRotation
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);
    const updatedStages = (adminRoadmapConfig.stages || []).map(s => {
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
    setAdminRoadmapConfig({ ...adminRoadmapConfig, stages: updatedStages });
    setEditingStageId(null);
  };

  const handleUpdateRoomField = (roomId: string, field: keyof TournamentRoom, value: any) => {
    setTournamentRooms(prev => prev.map(r => r.id === roomId ? { ...r, [field]: value } : r));
  };

  const handleScanScoreboard = async () => {
    if (!selectedRoomTournament || !scoreboardImage) {
      alert('Please upload or select a match end scoreboard screenshot first.');
      return;
    }
    setIsScanningOCR(true);
    try {
      const targetRoom = tournamentRooms.find(r => r.id === selectedScoreboardRoomId) || tournamentRooms[0];
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'SCAN_SCOREBOARD',
          screenshot: scoreboardImage,
          roomId: targetRoom?.id,
          roomLabel: targetRoom?.roomLabel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ocrResult?.teams) {
        setOcrConfidence(data.ocrResult.confidenceScore || 95);
        setEditableScores(data.ocrResult.teams.map((t: any) => ({
          teamName: t.teamName,
          participantId: t.participantId,
          rank: t.rank,
          placementPoints: t.placementPoints,
          kills: t.kills,
          killPoints: t.killPoints,
          totalPoints: t.totalPoints,
          booyah: t.booyah,
        })));
      } else {
        alert(data.message || 'AI Scoreboard scanning failed. You can enter scores manually.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error scanning scoreboard with AI.');
    } finally {
      setIsScanningOCR(false);
    }
  };

  const handleUpdateEditableScore = (index: number, field: 'rank' | 'kills' | 'teamName', value: string | number) => {
    setEditableScores(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;
      const cur = { ...updated[index] };

      if (field === 'teamName') {
        cur.teamName = String(value);
      } else if (field === 'rank') {
        cur.rank = Math.max(1, Number(value) || 1);
        const { placementPoints, killPoints, totalPoints } = calculateTeamPoints(cur.rank, cur.kills, selectedRoomTournament?.perKillPrize || 1);
        cur.placementPoints = placementPoints;
        cur.killPoints = killPoints;
        cur.totalPoints = totalPoints;
        cur.booyah = cur.rank === 1;
      } else if (field === 'kills') {
        cur.kills = Math.max(0, Number(value) || 0);
        const { placementPoints, killPoints, totalPoints } = calculateTeamPoints(cur.rank, cur.kills, selectedRoomTournament?.perKillPrize || 1);
        cur.placementPoints = placementPoints;
        cur.killPoints = killPoints;
        cur.totalPoints = totalPoints;
      }

      updated[index] = cur;
      return updated.sort((a, b) => a.rank - b.rank);
    });
  };

  const handleAddEditableRow = () => {
    setEditableScores(prev => {
      const nextRank = prev.length + 1;
      const { placementPoints, killPoints, totalPoints } = calculateTeamPoints(nextRank, 0, selectedRoomTournament?.perKillPrize || 1);
      return [
        ...prev,
        {
          teamName: `Squad #${nextRank}`,
          rank: nextRank,
          placementPoints,
          kills: 0,
          killPoints,
          totalPoints,
          booyah: nextRank === 1,
        },
      ];
    });
  };

  const handleRemoveEditableRow = (index: number) => {
    setEditableScores(prev => prev.filter((_, i) => i !== index));
  };

  const handlePublishPointsTable = async () => {
    if (!selectedRoomTournament || editableScores.length === 0) {
      alert('Please enter or scan scores before publishing.');
      return;
    }
    setIsSavingPointsTable(true);
    try {
      const targetRoom = tournamentRooms.find(r => r.id === selectedScoreboardRoomId) || tournamentRooms[0];
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'PUBLISH_POINTS_TABLE',
          tableData: {
            tournamentId: selectedRoomTournament.id,
            roomId: targetRoom?.id,
            roomLabel: targetRoom?.roomLabel || 'A',
            stage: selectedScoreboardStage || 'Round 1: Qualifiers',
            matchNumber: matchNumberInput,
            screenshotUrl: scoreboardImage || undefined,
            scores: editableScores,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Points Table published successfully!');
        await loadPointsTablesData(selectedRoomTournament.id);
      } else {
        alert(data.message || 'Failed to publish points table.');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to publish points table.');
    } finally {
      setIsSavingPointsTable(false);
    }
  };

  const handleBroadcastPointsTable = async (table: TournamentPointsTable) => {
    if (!selectedRoomTournament) return;
    const confirmMsg = `Send Points Table WhatsApp message ONLY to registered squads in Group ${table.roomLabel || 'A'} (Stage: ${table.stage || 'Match'})?\n\nNote: Squads in other groups will NOT receive this message.`;
    if (!confirm(confirmMsg)) return;

    setIsBroadcastingPointsTable(table.id);
    try {
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'BROADCAST_GROUP_POINTS',
          tableId: table.id,
          roomId: table.roomId,
          roomLabel: table.roomLabel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Points Table broadcast sent to squads of Group ${table.roomLabel || 'A'}!`);
      } else {
        alert(data.message || 'Failed to broadcast points table.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error broadcasting points table.');
    } finally {
      setIsBroadcastingPointsTable(null);
    }
  };

  const handleDeletePointsTable = async (tableId: string) => {
    if (!selectedRoomTournament) return;
    if (!confirm('Are you sure you want to delete this points table?')) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'DELETE_POINTS_TABLE',
          tableId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadPointsTablesData(selectedRoomTournament.id);
      } else {
        alert(data.message || 'Failed to delete points table.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting points table');
    }
  };

  const handleAssignSquadToRoom = async (participantId: string, targetRoomId: string, targetRoomLabel: string, slotNumber?: number) => {
    if (!selectedRoomTournament) return;
    setIsReassigningSquad(participantId);
    try {
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'ASSIGN_SQUAD_TO_ROOM',
          participantId,
          targetRoomId,
          targetRoomLabel,
          slotNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackTone('success');
        setFeedback(data.message || 'Squad reassigned successfully!');
        await loadTournamentRoomsData(selectedRoomTournament.id);
      } else {
        alert(data.message || 'Failed to reassign squad.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error reassigning squad');
    } finally {
      setIsReassigningSquad(null);
    }
  };

  const handleAutoDistributeSquads = async () => {
    if (!selectedRoomTournament) return;
    if (!confirm(`Auto-distribute all ${tournamentAllParticipants.length} registered squads evenly across groups (12 squads per group)?`)) return;
    setIsRoomsLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({ action: 'AUTO_DISTRIBUTE_SQUADS' }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackTone('success');
        setFeedback(data.message || 'Squads distributed across groups!');
        await loadTournamentRoomsData(selectedRoomTournament.id);
      } else {
        alert(data.message || 'Failed to auto-distribute squads.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error distributing squads');
    } finally {
      setIsRoomsLoading(false);
    }
  };

  const handleAddManualSquad = async () => {
    if (!selectedRoomTournament || !manualSquadForm.squadName.trim()) {
      alert('Squad Name is required');
      return;
    }
    try {
      const targetRoom = tournamentRooms.find(r => r.id === manualSquadForm.roomId || r.roomLabel === manualSquadForm.roomLabel) || tournamentRooms[0];
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'ADD_MANUAL_PARTICIPANT',
          squadData: {
            ...manualSquadForm,
            roomId: targetRoom?.id || manualSquadForm.roomId,
            roomLabel: targetRoom?.roomLabel || manualSquadForm.roomLabel,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setManualSquadModalOpen(false);
        setManualSquadForm({
          squadName: '',
          iglName: '',
          captainWhatsApp: '',
          player1Name: '',
          player2Name: '',
          player3Name: '',
          player4Name: '',
          roomId: '',
          roomLabel: '1',
          slotNumber: 1,
        });
        await loadTournamentRoomsData(selectedRoomTournament.id);
      } else {
        alert(data.message || 'Failed to add squad.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error adding squad');
    }
  };

  const handleRemoveSquadFromRoom = async (participantId: string, squadName: string) => {
    if (!selectedRoomTournament) return;
    if (!confirm(`Are you sure you want to remove squad "${squadName}" from this tournament?`)) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'REMOVE_SQUAD_FROM_ROOM',
          participantId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadTournamentRoomsData(selectedRoomTournament.id);
      } else {
        alert(data.message || 'Failed to remove squad.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error removing squad');
    }
  };

  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(null);

  const handleSendPreMatchReminder = async (room: TournamentRoom) => {
    if (!selectedRoomTournament) return;
    const confirmMsg = `Send 15-Minute Pre-Match WhatsApp Alert to all squads registered in Room ${room.roomLabel}?`;
    if (!confirm(confirmMsg)) return;

    setIsSendingReminder(room.id);
    try {
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          roomId: room.id,
          roomLabel: room.roomLabel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'WhatsApp pre-match reminders sent successfully!');
      } else {
        alert(data.message || 'Failed to send reminders.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error sending reminders.');
    } finally {
      setIsSendingReminder(null);
    }
  };

  const startEditRoom = (room: TournamentRoom) => {
    setEditingRoomId(room.id);
    setRoomEditForm({
      roomIdCredential: room.roomIdCredential || '',
      roomPassword: room.roomPassword || '',
      revealAt: toLocalISO(room.revealAt),
      isPublished: Boolean(room.isPublished),
      status: room.status || 'OPEN',
      capacity: room.capacity || 12,
      prizePool: room.prizePool || 0,
      matchTime: toLocalISO(room.matchTime),
      stageId: room.stageId || '',
      stageName: room.stageName || '',
      mapName: room.mapName || 'Bermuda',
      streamUrl: room.streamUrl || '',
      roomNotes: room.roomNotes || '',
    });
  };

  const handleSaveRoom = async (roomId: string) => {
    if (!selectedRoomTournament) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'UPDATE_ROOM',
          roomId,
          roomData: {
            ...roomEditForm,
            revealAt: roomEditForm.revealAt ? new Date(roomEditForm.revealAt).toISOString() : undefined,
            matchTime: roomEditForm.matchTime ? new Date(roomEditForm.matchTime).toISOString() : undefined,
          },
        }),
      });
      if (res.ok) {
        setFeedbackTone('success');
        setFeedback('Room details updated successfully!');
        setEditingRoomId(null);
        await loadTournamentRoomsData(selectedRoomTournament.id);
      }
    } catch (err: any) {
      setFeedbackTone('error');
      setFeedback(err?.message || 'Failed to update room');
    }
  };

  const handleCreateNewRoom = async (label?: string) => {
    if (!selectedRoomTournament) return;
    try {
      const res = await fetch(`/api/tournaments/${selectedRoomTournament.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'CREATE_ROOM',
          roomData: {
            roomLabel: label || undefined,
            roomType: selectedRoomTournament.tournamentBatchFormat === 'QUALIFIER_FINAL' ? 'QUALIFIER' : 'STANDALONE',
            capacity: selectedRoomTournament.roomCapacity || 12,
          },
        }),
      });
      if (res.ok) {
        await loadTournamentRoomsData(selectedRoomTournament.id);
      }
    } catch (err) {}
  };

  const handleBroadcastRoomWhatsappDirect = async (room: TournamentRoom) => {
    if (!selectedRoomTournament) return;
    if (!room.roomIdCredential || !room.roomPassword) {
      alert('Please set both Room ID and Room Password before broadcasting.');
      return;
    }
    if (!confirm(`Broadcast credentials for Room ${room.roomLabel} to all ${room.currentCount || 0} registered players via WhatsApp?`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          action: 'BROADCAST',
          tournamentId: selectedRoomTournament.id,
          tournamentTitle: `${selectedRoomTournament.title} [Room ${room.roomLabel}]`,
          roomId: room.roomIdCredential,
          pass: room.roomPassword,
        }),
      });
      if (res.ok) {
        alert(`WhatsApp credentials broadcast for Room ${room.roomLabel} sent successfully!`);
      }
    } catch {
      alert('Failed to broadcast room credentials.');
    }
  };

  const handleAdvanceSelectedSquads = async () => {
    if (!selectedRoomTournament || selectedAdvancingIds.length === 0) return;
    setIsAdvancing(true);
    try {
      const allParticipants: any[] = [];
      tournamentRooms.forEach((r: any) => {
        if (r.participants) {
          r.participants.forEach((p: any) => {
            if (selectedAdvancingIds.includes(p.id)) {
              allParticipants.push({
                participantId: p.id,
                userId: p.userId || p.id,
                squadName: p.squadName,
                iglName: p.iglName,
                sourceRoomId: r.id,
              });
            }
          });
        }
      });

      const res = await fetch(`/api/admin/tournaments/${selectedRoomTournament.id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({
          advancingParticipants: allParticipants,
          targetRoomId: advanceTargetRoomId || undefined,
          targetStageName: advanceTargetStageName || 'Grand Finals',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Squads advanced to target stage!');
        setSelectedAdvancingIds([]);
        await loadTournamentRoomsData(selectedRoomTournament.id);
      } else {
        alert(data.message || 'Failed to advance squads.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error advancing squads');
    } finally {
      setIsAdvancing(false);
    }
  };

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
      const response = await fetch('/api/admin/tournaments', { 
        credentials: 'include',
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const payload = await response.json();
        setTournaments(payload.tournaments || []);
      }
    } catch (err) {
      console.warn('Failed to load tournaments:', err);
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
      tournamentBatchFormat: item.tournamentBatchFormat || 'SINGLE_ROOM',
      roomCapacity: item.roomCapacity || 12,
      maxRooms: item.maxRooms || '',
      defaultAdvancementCount: item.defaultAdvancementCount || 3,
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
      tournamentBatchFormat: form.tournamentBatchFormat,
      roomCapacity: Number(form.roomCapacity) || 12,
      maxRooms: form.maxRooms !== '' ? Number(form.maxRooms) : undefined,
      defaultAdvancementCount: Number(form.defaultAdvancementCount) || 3,
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
                    <select
                      value={item.status === 'DRAFT' ? 'PENDING' : item.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as TournamentStatus;
                        void handleQuickAction(item.id, {
                          status: newStatus,
                          isPublished: newStatus !== 'DRAFT',
                        });
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase border outline-none cursor-pointer transition-all ${
                        item.status === 'RUNNING'
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                          : item.status === 'UPCOMING'
                          ? 'bg-blue-950/70 border-blue-600/80 text-blue-300'
                          : item.status === 'PENDING' || item.status === 'DRAFT'
                          ? 'bg-amber-950/70 border-amber-600/80 text-amber-300'
                          : item.status === 'LIVE'
                          ? 'bg-red-950/70 border-red-600/80 text-red-300 animate-pulse'
                          : item.status === 'FINISHED'
                          ? 'bg-slate-900 border-slate-700 text-slate-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <option value="RUNNING" className="bg-slate-900 text-emerald-400 font-bold">🟢 RUNNING</option>
                      <option value="UPCOMING" className="bg-slate-900 text-blue-400 font-bold">🔵 UPCOMING</option>
                      <option value="PENDING" className="bg-slate-900 text-amber-400 font-bold">🟡 PENDING</option>
                      <option value="LIVE" className="bg-slate-900 text-red-400 font-bold">🔴 LIVE</option>
                      <option value="FINISHED" className="bg-slate-900 text-slate-400 font-bold">🏁 FINISHED</option>
                      <option value="CANCELLED" className="bg-slate-900 text-slate-400 font-bold">⚪ CANCELLED</option>
                    </select>
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
                      { id: 'COINS', label: '🪙 Coins Only', desc: 'শুধু EZBD কয়েন' },
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
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      Tournament Status (ট্যুরনামেন্ট অবস্থা) <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={form.status === 'DRAFT' ? 'PENDING' : form.status} 
                      onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as TournamentStatus }))} 
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-slate-900 font-bold shadow-sm focus:border-red-300 focus:ring-1 focus:ring-red-300 outline-none cursor-pointer"
                    >
                      <option value="PENDING">🟡 PENDING (পেন্ডিং - সব জায়গায় দেখাবে, রেজিস্ট্রেশন বন্ধ)</option>
                      <option value="UPCOMING">🔵 UPCOMING (আপকামিং - সব জায়গায় দেখাবে, রেজিস্ট্রেশন বন্ধ)</option>
                      <option value="RUNNING">🟢 RUNNING (চলমান - লাইভ রেজিস্ট্রেশন চালু ও জয়েন করা যাবে)</option>
                      <option value="LIVE">🔴 LIVE (লাইভ - ম্যাচ চলমান)</option>
                      <option value="FINISHED">🏁 FINISHED (সমাপ্ত / ফিনিশড - ম্যাচ শেষ)</option>
                      <option value="CANCELLED">⚪ CANCELLED (বাতিল করা হয়েছে)</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      💡 আপনি সরাসরি যে কোনো সময় ট্যুরনামেন্টকে <strong>PENDING</strong>, <strong>UPCOMING</strong>, <strong>RUNNING</strong> অথবা <strong>FINISHED</strong> এ পরিবর্তন করতে পারেন।
                    </p>
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

                {/* ─── Multi-Room Batching Configuration ─── */}
                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <div>
                      <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">Tournament Multi-Room / Group Batching</h4>
                      <p className="text-[11px] text-purple-700">Configure how players are slotted into rooms (e.g. Free Fire 12-squad custom lobbies).</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 pt-1">
                    <label className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${form.tournamentBatchFormat === 'SINGLE_ROOM' ? 'bg-white border-purple-600 shadow-xs' : 'bg-white/60 border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tournamentBatchFormat"
                          value="SINGLE_ROOM"
                          checked={form.tournamentBatchFormat === 'SINGLE_ROOM'}
                          onChange={() => setForm(prev => ({ ...prev, tournamentBatchFormat: 'SINGLE_ROOM' }))}
                          className="accent-purple-600"
                        />
                        <span className="text-xs font-bold text-slate-900">Single Room</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">1 custom room lobby only</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${form.tournamentBatchFormat === 'QUALIFIER_FINAL' ? 'bg-white border-purple-600 shadow-xs' : 'bg-white/60 border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tournamentBatchFormat"
                          value="QUALIFIER_FINAL"
                          checked={form.tournamentBatchFormat === 'QUALIFIER_FINAL'}
                          onChange={() => setForm(prev => ({ ...prev, tournamentBatchFormat: 'QUALIFIER_FINAL' }))}
                          className="accent-purple-600"
                        />
                        <span className="text-xs font-bold text-slate-900">Format A: Qualifiers → Final</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">Top teams advance to Final Room</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${form.tournamentBatchFormat === 'INDEPENDENT_ROOMS' ? 'bg-white border-purple-600 shadow-xs' : 'bg-white/60 border-slate-200'}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="tournamentBatchFormat"
                          value="INDEPENDENT_ROOMS"
                          checked={form.tournamentBatchFormat === 'INDEPENDENT_ROOMS'}
                          onChange={() => setForm(prev => ({ ...prev, tournamentBatchFormat: 'INDEPENDENT_ROOMS' }))}
                          className="accent-purple-600"
                        />
                        <span className="text-xs font-bold text-slate-900">Format B: Independent Rooms</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1">Standalone rooms with separate prizes</span>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Room Capacity (Slots)</label>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={form.roomCapacity}
                        onChange={(e) => setForm(prev => ({ ...prev, roomCapacity: Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none focus:border-purple-600"
                        placeholder="e.g. 12"
                      />
                      <span className="text-[9px] text-slate-400">Free Fire = 12 squads</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Max Rooms Cap</label>
                      <input
                        type="number"
                        min="1"
                        value={form.maxRooms}
                        onChange={(e) => setForm(prev => ({ ...prev, maxRooms: e.target.value === '' ? '' : Number(e.target.value) }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none focus:border-purple-600"
                        placeholder="Unlimited"
                      />
                      <span className="text-[9px] text-slate-400">Optional room limit</span>
                    </div>

                    {form.tournamentBatchFormat === 'QUALIFIER_FINAL' && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Top Advance to Final</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={form.defaultAdvancementCount}
                          onChange={(e) => setForm(prev => ({ ...prev, defaultAdvancementCount: Number(e.target.value) }))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none focus:border-purple-600"
                          placeholder="e.g. 3"
                        />
                        <span className="text-[9px] text-slate-400">Top N squads per room</span>
                      </div>
                    )}
                  </div>
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

      {/* ─── 4. "MANAGE ROOMS & GROUPS" MODAL (Admin Exclusive) ──────────────── */}
      {roomModalOpen && selectedRoomTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-2xl text-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border ${roomActiveTab === 'ROADMAP' ? 'bg-amber-950/80 border-amber-800/60 text-amber-400' : 'bg-purple-950/80 border-purple-800/60 text-purple-400'}`}>
                  {roomActiveTab === 'ROADMAP' ? <Trophy className="h-6 w-6 text-brand-gold" /> : <Layers className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-heading font-black text-white">
                      {roomActiveTab === 'ROADMAP' ? 'TOURNAMENT ROADMAP & SCHEDULE' : 'ROOM & GROUP BATCHING CENTER'}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 font-extrabold uppercase border border-purple-700/60">
                      {selectedRoomTournament.tournamentBatchFormat === 'QUALIFIER_FINAL' ? 'Format A: Qualifier → Final' : selectedRoomTournament.tournamentBatchFormat === 'INDEPENDENT_ROOMS' ? 'Format B: Independent Rooms' : 'Single Room'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {selectedRoomTournament.title} • {roomActiveTab === 'ROADMAP' ? 'Multi-Stage tournament progression, schedules & live streams' : `Capacity: ${selectedRoomTournament.roomCapacity || 12} squads/group (Auto: 1-12 in Group 1, 13-24 in Group 2...)`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setRoomModalOpen(false)}
                className="rounded-2xl border border-slate-800 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-tabs Header */}
            <div className="flex items-center justify-between gap-3 mt-4 border-b border-slate-800/80 pb-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setRoomActiveTab('ROADMAP')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    roomActiveTab === 'ROADMAP'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-brand-gold" />
                  <span>🎯 Roadmap &amp; Stages ({adminRoadmapConfig?.stages?.length || 1})</span>
                </button>

                <button
                  onClick={() => setRoomActiveTab('ROSTER')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    roomActiveTab === 'ROSTER'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>👥 Squads &amp; Roster Matrix ({tournamentAllParticipants.length})</span>
                </button>

                <button
                  onClick={() => setRoomActiveTab('ROOMS')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    roomActiveTab === 'ROOMS'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Rooms Overview ({tournamentRooms.length})</span>
                </button>

                <button
                  onClick={() => setRoomActiveTab('POINTS_TABLE')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    roomActiveTab === 'POINTS_TABLE'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>AI Points Table Studio ({adminPointsTables.length})</span>
                </button>

                {selectedRoomTournament.tournamentBatchFormat === 'QUALIFIER_FINAL' && (
                  <button
                    onClick={() => setRoomActiveTab('QUALIFIERS')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                      roomActiveTab === 'QUALIFIERS'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Qualifier Advancement Tool</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreateNewRoom()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold border border-purple-800/50 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Room</span>
                </button>
                {selectedRoomTournament.tournamentBatchFormat === 'QUALIFIER_FINAL' && !tournamentRooms.some(r => r.roomType === 'FINAL') && (
                  <button
                    onClick={() => handleCreateNewRoom('Final')}
                    className="px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 text-xs font-bold border border-purple-700 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Create Final Room</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            {isRoomsLoading ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span>Loading room roster &amp; batch data...</span>
              </div>
            ) : roomActiveTab === 'ROADMAP' ? (
              /* TAB 1: TOURNAMENT ROADMAP & MULTI-STAGE SCHEDULE STUDIO */
              <div className="mt-4 space-y-6">
                {/* 1. Header & Configuration Controls */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-brand-gold" />
                        <span>Tournament Progression Pipeline &amp; Stage Scheduler</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Configure multi-stage tournaments, map rotations, group match times, stream links, and advancement rules.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAutoGenerateRoadmap}
                        className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Auto-calculate stages based on total slots and format"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                        <span>Auto-Generate Stages</span>
                      </button>

                      <button
                        onClick={() => handleSaveRoadmap()}
                        disabled={isRoadmapSaving}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {isRoadmapSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Save Roadmap &amp; Stages</span>
                      </button>
                    </div>
                  </div>

                  {/* Pipeline Title & Subtitle Settings */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Pipeline Title</label>
                      <input
                        type="text"
                        value={adminRoadmapConfig?.pipelineTitle || ''}
                        onChange={(e) =>
                          setAdminRoadmapConfig((prev) =>
                            prev ? { ...prev, pipelineTitle: e.target.value } : null
                          )
                        }
                        placeholder="TOURNAMENT ROADMAP & SCHEDULE"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Pipeline Format Badge</label>
                      <input
                        type="text"
                        value={adminRoadmapConfig?.pipelineFormat || ''}
                        onChange={(e) =>
                          setAdminRoadmapConfig((prev) =>
                            prev ? { ...prev, pipelineFormat: e.target.value } : null
                          )
                        }
                        placeholder="Format A: Qualifier → Final"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Subtitle / Tagline</label>
                      <input
                        type="text"
                        value={adminRoadmapConfig?.pipelineSubtitle || ''}
                        onChange={(e) =>
                          setAdminRoadmapConfig((prev) =>
                            prev ? { ...prev, pipelineSubtitle: e.target.value } : null
                          )
                        }
                        placeholder="Multi-Stage progression, group schedules, and map rotations."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Stages Timeline Manager */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span>Tournament Stages ({adminRoadmapConfig?.stages?.length || 0})</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Manage stage progression order, match schedules, map pools, and live statuses.
                      </p>
                    </div>

                    <button
                      onClick={handleAddStage}
                      className="px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 text-xs font-bold border border-purple-700/60 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Stage</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(!adminRoadmapConfig?.stages || adminRoadmapConfig.stages.length === 0) ? (
                      <div className="p-6 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800 text-xs">
                        No stages configured. Click &quot;Auto-Generate Stages&quot; or &quot;Add Stage&quot; to create one.
                      </div>
                    ) : (
                      adminRoadmapConfig.stages.map((stg, sIdx) => {
                        const isEditingThisStage = editingStageId === stg.id;
                        return (
                          <div
                            key={stg.id || sIdx}
                            className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                                  {stg.stageNumber || sIdx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-white text-sm">{stg.name}</h5>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        stg.status === 'LIVE'
                                          ? 'bg-red-950 text-red-400 border border-red-800'
                                          : stg.status === 'COMPLETED'
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {stg.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {stg.subtitle || 'Match Stage'} • Maps:{' '}
                                    {(stg.mapRotation || ['Bermuda']).join(', ')}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    isEditingThisStage
                                      ? setEditingStageId(null)
                                      : startEditStage(stg)
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer border border-slate-700"
                                >
                                  {isEditingThisStage ? 'Cancel' : 'Edit Stage'}
                                </button>

                                <button
                                  onClick={() => handleDeleteStage(stg.id)}
                                  className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-400 transition-colors cursor-pointer"
                                  title="Delete Stage"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Inline Stage Edit Form */}
                            {isEditingThisStage && (
                              <div className="mt-3 p-4 bg-slate-950/90 rounded-xl border border-purple-800/60 space-y-3 animate-fadeIn">
                                <h5 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                                  Edit Stage #{stg.stageNumber || sIdx + 1} Properties
                                </h5>

                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                      Stage Name
                                    </label>
                                    <input
                                      type="text"
                                      value={stageEditForm.name}
                                      onChange={(e) =>
                                        setStageEditForm((prev) => ({
                                          ...prev,
                                          name: e.target.value,
                                        }))
                                      }
                                      placeholder="e.g. Round 1: Qualifiers"
                                      className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                      Stage Subtitle
                                    </label>
                                    <input
                                      type="text"
                                      value={stageEditForm.subtitle}
                                      onChange={(e) =>
                                        setStageEditForm((prev) => ({
                                          ...prev,
                                          subtitle: e.target.value,
                                        }))
                                      }
                                      placeholder="e.g. 4 Groups • Top 3 Advance"
                                      className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                      Stage Status
                                    </label>
                                    <select
                                      value={stageEditForm.status}
                                      onChange={(e) =>
                                        setStageEditForm((prev) => ({
                                          ...prev,
                                          status: e.target.value as any,
                                        }))
                                      }
                                      className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                    >
                                      <option value="UPCOMING">⏳ UPCOMING</option>
                                      <option value="LIVE">🔴 LIVE</option>
                                      <option value="COMPLETED">🏁 COMPLETED</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                      Match Date &amp; Time
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={stageEditForm.matchTime}
                                      onChange={(e) =>
                                        setStageEditForm((prev) => ({
                                          ...prev,
                                          matchTime: e.target.value,
                                        }))
                                      }
                                      className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                      Map Rotation (comma separated)
                                    </label>
                                    <input
                                      type="text"
                                      value={stageEditForm.mapRotation}
                                      onChange={(e) =>
                                        setStageEditForm((prev) => ({
                                          ...prev,
                                          mapRotation: e.target.value,
                                        }))
                                      }
                                      placeholder="Bermuda, Purgatory, Kalahari"
                                      className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                      Live Stream URL
                                    </label>
                                    <input
                                      type="url"
                                      value={stageEditForm.streamUrl}
                                      onChange={(e) =>
                                        setStageEditForm((prev) => ({
                                          ...prev,
                                          streamUrl: e.target.value,
                                        }))
                                      }
                                      placeholder="https://youtube.com/live/..."
                                      className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button
                                    onClick={() => handleSaveStageEdit(stg.id)}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                                  >
                                    Apply Stage Changes
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. Group Schedules & Map Rotation Allocation Matrix */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4 text-brand-orange" />
                        <span>Group Schedule &amp; Map Allocation Matrix</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Assign custom maps, match times, live stream links, and stages for each custom room.
                      </p>
                    </div>

                    <button
                      onClick={() => handleSaveRoadmap()}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 text-xs font-bold border border-purple-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Room Schedules</span>
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tournamentRooms.map((room) => {
                      const isFinal = room.roomType === 'FINAL' || room.roomLabel.toLowerCase() === 'final';
                      return (
                        <div
                          key={room.id}
                          className={`p-4 rounded-2xl border space-y-3 ${
                            isFinal
                              ? 'bg-purple-950/40 border-purple-700/80'
                              : 'bg-slate-900/70 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isFinal ? 'bg-amber-500 text-black' : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}>
                              Group {room.roomLabel}
                            </span>

                            <span className="text-[10px] text-slate-400 font-mono">
                              {room.currentCount || 0}/{room.capacity || 12} Squads
                            </span>
                          </div>

                          {/* Stage Selector */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Assign Stage
                            </label>
                            <select
                              value={room.stageId || ''}
                              onChange={(e) => handleUpdateRoomField(room.id, 'stageId', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs font-bold text-white outline-none focus:border-purple-500"
                            >
                              <option value="">Default / Auto Assign</option>
                              {(adminRoadmapConfig?.stages || []).map((stg) => (
                                <option key={stg.id} value={stg.id}>
                                  {stg.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Map Selector */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Assigned Map
                            </label>
                            <select
                              value={room.mapName || 'Bermuda'}
                              onChange={(e) => handleUpdateRoomField(room.id, 'mapName', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs font-bold text-brand-orange outline-none focus:border-purple-500"
                            >
                              <option value="Bermuda">🗺️ Bermuda</option>
                              <option value="Purgatory">🗺️ Purgatory</option>
                              <option value="Kalahari">🗺️ Kalahari</option>
                              <option value="Alpine">🗺️ Alpine</option>
                              <option value="NexTerra">🗺️ NexTerra</option>
                              <option value="Bermuda Remastered">🗺️ Bermuda Remastered</option>
                            </select>
                          </div>

                          {/* Match Time */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Group Match Time
                            </label>
                            <input
                              type="datetime-local"
                              value={toLocalISO(room.matchTime)}
                              onChange={(e) =>
                                handleUpdateRoomField(
                                  room.id,
                                  'matchTime',
                                  e.target.value ? new Date(e.target.value).toISOString() : undefined
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs font-bold text-white outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* Stream URL */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Group Stream URL
                            </label>
                            <input
                              type="url"
                              value={room.streamUrl || ''}
                              onChange={(e) => handleUpdateRoomField(room.id, 'streamUrl', e.target.value)}
                              placeholder="https://youtube.com/live/..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs font-mono text-white outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Advancement Architecture & Rules Cards Editor */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-gold" />
                        <span>Advancement Rules &amp; Explainer Cards</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Edit the 3 rule cards displayed at the bottom of the public tournament roadmap.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (!adminRoadmapConfig) return;
                        const currentRules = adminRoadmapConfig.rules || [];
                        const newRule: TournamentRoadmapRuleItem = {
                          stepNumber: currentRules.length + 1,
                          title: `Rule #${currentRules.length + 1}`,
                          description: 'Rule description goes here.',
                        };
                        setAdminRoadmapConfig({
                          ...adminRoadmapConfig,
                          rules: [...currentRules, newRule],
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 text-xs font-bold border border-purple-700/60 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Rule Card</span>
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {(adminRoadmapConfig?.rules || []).map((rule, rIdx) => (
                      <div
                        key={rule.stepNumber || rIdx}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center">
                            {rule.stepNumber || rIdx + 1}
                          </span>
                          <button
                            onClick={() => {
                              if (!adminRoadmapConfig) return;
                              const updatedRules = (adminRoadmapConfig.rules || []).filter((_, idx) => idx !== rIdx);
                              setAdminRoadmapConfig({ ...adminRoadmapConfig, rules: updatedRules });
                            }}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                            title="Remove Card"
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
                              if (!adminRoadmapConfig) return;
                              const updatedRules = [...(adminRoadmapConfig.rules || [])];
                              updatedRules[rIdx] = { ...updatedRules[rIdx], title: e.target.value };
                              setAdminRoadmapConfig({ ...adminRoadmapConfig, rules: updatedRules });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs font-bold text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Card Description</label>
                          <textarea
                            rows={3}
                            value={rule.description}
                            onChange={(e) => {
                              if (!adminRoadmapConfig) return;
                              const updatedRules = [...(adminRoadmapConfig.rules || [])];
                              updatedRules[rIdx] = { ...updatedRules[rIdx], description: e.target.value };
                              setAdminRoadmapConfig({ ...adminRoadmapConfig, rules: updatedRules });
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-300 outline-none focus:border-purple-500 resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : roomActiveTab === 'ROSTER' ? (
              /* TAB 2: SQUADS & ROOM ALLOCATION MATRIX */
              <div className="mt-4 space-y-5">
                {/* 1. Header Toolbar */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        <span>Squads &amp; Room Allocation Roster ({tournamentAllParticipants.length} Teams)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Manage all registered teams, move teams between Group A, B, C, Final Room, or add manual squads.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleAutoDistributeSquads}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-950/90 hover:bg-purple-900 border border-purple-700/80 text-purple-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Auto-distribute all squads evenly into 12-slot groups"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                        <span>⚡ Auto-Distribute to Groups</span>
                      </button>

                      <button
                        onClick={() => setManualSquadModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>➕ Add Squad to Room</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills & Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setRosterFilterRoom('ALL')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          rosterFilterRoom === 'ALL'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        All Teams ({tournamentAllParticipants.length})
                      </button>

                      <button
                        onClick={() => setRosterFilterRoom('UNASSIGNED')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          rosterFilterRoom === 'UNASSIGNED'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        ⚠️ Unassigned ({tournamentAllParticipants.filter(p => !p.roomId && !p.roomLabel).length})
                      </button>

                      {tournamentRooms.map(r => {
                        const countInRoom = tournamentAllParticipants.filter(p => p.roomId === r.id || p.roomLabel === r.roomLabel).length;
                        return (
                          <button
                            key={r.id}
                            onClick={() => setRosterFilterRoom(r.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              rosterFilterRoom === r.id
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {r.roomType === 'FINAL' || r.roomLabel === 'Final' ? '🏆 Final' : formatRoomLabel(r.roomLabel, r.roomType)} ({countInRoom}/{r.capacity || 12})
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative min-w-[220px]">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        value={rosterSearchQuery}
                        onChange={(e) => setRosterSearchQuery(e.target.value)}
                        placeholder="Search squad or captain..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Squads Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 shadow-xl">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 text-[10px]">
                      <tr>
                        <th className="px-4 py-3 w-14 text-center">Slot</th>
                        <th className="px-4 py-3">Squad Name</th>
                        <th className="px-4 py-3">Captain / IGL</th>
                        <th className="px-4 py-3">WhatsApp Contact</th>
                        <th className="px-4 py-3 w-48">Assigned Group</th>
                        <th className="px-4 py-3 w-20 text-center">Slot #</th>
                        <th className="px-4 py-3 w-20 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {tournamentAllParticipants
                        .filter(p => {
                          if (rosterFilterRoom === 'UNASSIGNED') {
                            return !p.roomId && !p.roomLabel;
                          }
                          if (rosterFilterRoom !== 'ALL') {
                            return p.roomId === rosterFilterRoom || p.roomLabel === rosterFilterRoom;
                          }
                          return true;
                        })
                        .filter(p => {
                          if (!rosterSearchQuery.trim()) return true;
                          const q = rosterSearchQuery.toLowerCase();
                          return (
                            (p.squadName && p.squadName.toLowerCase().includes(q)) ||
                            (p.iglName && p.iglName.toLowerCase().includes(q)) ||
                            (p.captainWhatsApp && p.captainWhatsApp.includes(q))
                          );
                        })
                        .map((p, idx) => {
                          const assignedRoom = tournamentRooms.find(r => r.id === p.roomId || r.roomLabel === p.roomLabel);
                          const isAssigned = Boolean(assignedRoom || p.roomLabel);

                          return (
                            <tr key={p.id || idx} className="hover:bg-slate-900/60 transition-colors">
                              {/* Slot Number */}
                              <td className="px-4 py-3 text-center font-mono">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-bold text-[11px]">
                                  #{p.slotNumber || idx + 1}
                                </span>
                              </td>

                              {/* Squad Name */}
                              <td className="px-4 py-3 font-bold text-white">
                                <div>{p.squadName}</div>
                                {(p.player2Name || p.player3Name) && (
                                  <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                    {[p.player1Name, p.player2Name, p.player3Name, p.player4Name].filter(Boolean).join(', ')}
                                  </div>
                                )}
                              </td>

                              {/* IGL Name */}
                              <td className="px-4 py-3 text-slate-300 font-medium">
                                {p.iglName || 'Captain'}
                              </td>

                              {/* WhatsApp Contact */}
                              <td className="px-4 py-3 font-mono text-xs">
                                {p.captainWhatsApp ? (
                                  <a
                                    href={`https://wa.me/${p.captainWhatsApp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-400 hover:underline flex items-center gap-1"
                                    title="Open WhatsApp chat"
                                  >
                                    <MessageSquare className="w-3 h-3 text-emerald-400 inline" />
                                    <span>{p.captainWhatsApp}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-500 italic">No WhatsApp</span>
                                )}
                              </td>

                              {/* Room Reassignment Dropdown */}
                              <td className="px-4 py-3">
                                <select
                                  value={p.roomId || p.roomLabel || ''}
                                  disabled={isReassigningSquad === p.id}
                                  onChange={(e) => {
                                    const selectedVal = e.target.value;
                                    if (!selectedVal) {
                                      handleAssignSquadToRoom(p.id, '', '', p.slotNumber);
                                    } else {
                                      const targetR = tournamentRooms.find(r => r.id === selectedVal || r.roomLabel === selectedVal);
                                      if (targetR) {
                                        handleAssignSquadToRoom(p.id, targetR.id, targetR.roomLabel, p.slotNumber);
                                      }
                                    }
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold outline-none cursor-pointer ${
                                    isAssigned
                                      ? 'bg-slate-900 border-purple-800/80 text-purple-300 focus:border-purple-500'
                                      : 'bg-amber-950/40 border-amber-800/80 text-amber-300 focus:border-amber-500'
                                  }`}
                                >
                                  <option value="">⚠️ Unassigned</option>
                                  {tournamentRooms.map(r => (
                                    <option key={r.id} value={r.id}>
                                      {r.roomType === 'FINAL' || r.roomLabel === 'Final' ? '🏆 Final Room' : formatRoomLabel(r.roomLabel, r.roomType)}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Slot Number In Room */}
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={p.slotNumber || 1}
                                  onChange={(e) => {
                                    const newSlot = Number(e.target.value) || 1;
                                    handleAssignSquadToRoom(p.id, p.roomId || '', p.roomLabel || '', newSlot);
                                  }}
                                  className="w-12 px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-center font-mono font-bold text-white text-xs"
                                />
                              </td>

                              {/* Action: Delete / Remove */}
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleRemoveSquadFromRoom(p.id, p.squadName)}
                                  className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900 border border-red-800 text-red-400 transition-colors cursor-pointer"
                                  title="Remove Squad from tournament"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>

                  {tournamentAllParticipants.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No squads registered in this tournament yet. Click &quot;Add Squad to Room&quot; to register one manually.
                    </div>
                  )}
                </div>

                {/* 3. Manual Squad Add Modal Popup */}
                {manualSquadModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
                    <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-2xl space-y-4 text-slate-200">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Plus className="w-4 h-4 text-emerald-400" />
                          <span>Add Squad to Group / Room</span>
                        </h4>
                        <button
                          onClick={() => setManualSquadModalOpen(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Squad Name *</label>
                          <input
                            type="text"
                            value={manualSquadForm.squadName}
                            onChange={(e) => setManualSquadForm(prev => ({ ...prev, squadName: e.target.value }))}
                            placeholder="e.g. Royal Esports"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Captain / IGL Name *</label>
                          <input
                            type="text"
                            value={manualSquadForm.iglName}
                            onChange={(e) => setManualSquadForm(prev => ({ ...prev, iglName: e.target.value }))}
                            placeholder="e.g. Tanvir (IGL)"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">WhatsApp Number *</label>
                          <input
                            type="text"
                            value={manualSquadForm.captainWhatsApp}
                            onChange={(e) => setManualSquadForm(prev => ({ ...prev, captainWhatsApp: e.target.value }))}
                            placeholder="017xxxxxxxx"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono font-bold text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Assign to Group / Room</label>
                          <select
                            value={manualSquadForm.roomId}
                            onChange={(e) => {
                              const r = tournamentRooms.find(rm => rm.id === e.target.value);
                              setManualSquadForm(prev => ({
                                ...prev,
                                roomId: e.target.value,
                                roomLabel: r?.roomLabel || '1',
                              }));
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                          >
                            {tournamentRooms.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.roomType === 'FINAL' || r.roomLabel === 'Final' ? '🏆 Final Room' : formatRoomLabel(r.roomLabel, r.roomType)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Slot # in Group</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={manualSquadForm.slotNumber}
                            onChange={(e) => setManualSquadForm(prev => ({ ...prev, slotNumber: Number(e.target.value) || 1 }))}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">Player 2 Name</label>
                          <input
                            type="text"
                            value={manualSquadForm.player2Name}
                            onChange={(e) => setManualSquadForm(prev => ({ ...prev, player2Name: e.target.value }))}
                            placeholder="Player 2"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-white outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                        <button
                          onClick={() => setManualSquadModalOpen(false)}
                          className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddManualSquad}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-black shadow-md cursor-pointer"
                        >
                          Save Squad
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : roomActiveTab === 'ROOMS' ? (
              /* TAB 3: ROOMS LIST & CREDENTIALS EDITOR */
              <div className="mt-4 space-y-4">
                {tournamentRooms.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
                    No custom groups configured yet. Click &quot;Add Room&quot; above to create Group 1.
                  </div>
                ) : (
                  tournamentRooms.map((room) => {
                    const isFinal = room.roomType === 'FINAL' || room.roomLabel === 'Final';
                    const isEditing = editingRoomId === room.id;
                    const participants = (room as any).participants || [];
                    const isFull = participants.length >= (room.capacity || 12);
                    const groupLabelStr = formatRoomLabel(room.roomLabel, room.roomType);

                    return (
                      <div
                        key={room.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          isFinal
                            ? 'bg-purple-950/30 border-purple-800/80 shadow-xs'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Room Header Banner */}
                        <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-800/80">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-xl text-xs font-mono font-black ${
                              isFinal ? 'bg-purple-600 text-white' : 'bg-brand-orange text-white'
                            }`}>
                              {groupLabelStr.toUpperCase()}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{isFinal ? '🏆 Championship Final Room' : `${groupLabelStr}`}</span>
                                <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold ${
                                  isFull ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                }`}>
                                  {participants.length}/{room.capacity || 12} Filled
                                </span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Status: {room.status} • Map: {room.mapName || 'Bermuda'} • Match: {room.matchTime ? new Date(room.matchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Same as Tournament'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSendPreMatchReminder(room)}
                              disabled={isSendingReminder === room.id || !room.currentCount}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              title="Send 15-minute pre-match reminder to this group's players"
                            >
                              {isSendingReminder === room.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                              ) : (
                                <Send className="w-3.5 h-3.5 text-purple-400" />
                              )}
                              <span>15m Reminder</span>
                            </button>
                            {room.roomIdCredential && room.roomPassword && (
                              <button
                                onClick={() => handleBroadcastRoomWhatsappDirect(room)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="Broadcast Room ID & Pass to this group's players"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Broadcast ID/Pass</span>
                              </button>
                            )}
                            <button
                              onClick={() => isEditing ? setEditingRoomId(null) : startEditRoom(room)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-colors cursor-pointer"
                            >
                              {isEditing ? 'Cancel' : 'Edit Credentials'}
                            </button>
                          </div>
                        </div>

                        {/* Edit Credentials Form Drawer */}
                        {isEditing && (
                          <div className="mt-3 p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3 animate-fadeIn">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                              Edit {groupLabelStr} Credentials &amp; Schedule Settings
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Room ID</label>
                                <input
                                  type="text"
                                  value={roomEditForm.roomIdCredential}
                                  onChange={(e) => setRoomEditForm(prev => ({ ...prev, roomIdCredential: e.target.value }))}
                                  placeholder="e.g. 8492049"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono font-bold text-white outline-none focus:border-purple-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Room Password</label>
                                <input
                                  type="text"
                                  value={roomEditForm.roomPassword}
                                  onChange={(e) => setRoomEditForm(prev => ({ ...prev, roomPassword: e.target.value }))}
                                  placeholder="e.g. 1234"
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono font-bold text-white outline-none focus:border-purple-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Credentials Unlock Time (revealAt)</label>
                                <input
                                  type="datetime-local"
                                  value={roomEditForm.revealAt}
                                  onChange={(e) => setRoomEditForm(prev => ({ ...prev, revealAt: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Room Status</label>
                                <select
                                  value={roomEditForm.status}
                                  onChange={(e) => setRoomEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                >
                                  <option value="OPEN">🟢 OPEN</option>
                                  <option value="FULL">🔴 FULL</option>
                                  <option value="LIVE">🔥 LIVE</option>
                                  <option value="COMPLETED">🏁 COMPLETED</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Map Rotation</label>
                                <select
                                  value={roomEditForm.mapName || 'Bermuda'}
                                  onChange={(e) => setRoomEditForm(prev => ({ ...prev, mapName: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-brand-orange outline-none focus:border-purple-500"
                                >
                                  <option value="Bermuda">🗺️ Bermuda</option>
                                  <option value="Purgatory">🗺️ Purgatory</option>
                                  <option value="Kalahari">🗺️ Kalahari</option>
                                  <option value="Alpine">🗺️ Alpine</option>
                                  <option value="NexTerra">🗺️ NexTerra</option>
                                  <option value="Bermuda Remastered">🗺️ Bermuda Remastered</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Group Match Time</label>
                                <input
                                  type="datetime-local"
                                  value={roomEditForm.matchTime}
                                  onChange={(e) => setRoomEditForm(prev => ({ ...prev, matchTime: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Live Stream URL</label>
                                <input
                                  type="url"
                                  value={roomEditForm.streamUrl}
                                  onChange={(e) => setRoomEditForm(prev => ({ ...prev, streamUrl: e.target.value }))}
                                  placeholder="https://youtube.com/live/..."
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono text-white outline-none focus:border-purple-500"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Assign Stage</label>
                                <select
                                  value={roomEditForm.stageId}
                                  onChange={(e) => setRoomEditForm(prev => ({ ...prev, stageId: e.target.value }))}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500"
                                >
                                  <option value="">Default / Auto</option>
                                  {(adminRoadmapConfig?.stages || []).map(stg => (
                                    <option key={stg.id} value={stg.id}>
                                      {stg.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={roomEditForm.isPublished}
                                  onChange={(e) => setRoomEditForm(prev => ({ ...prev, isPublished: e.target.checked }))}
                                  className="accent-purple-600 rounded"
                                />
                                <span>Publish Room (Allow registered players to reveal upon countdown unlock)</span>
                              </label>

                              <button
                                onClick={() => handleSaveRoom(room.id)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black shadow-md hover:brightness-110 transition-all cursor-pointer"
                              >
                                Save Room Credentials
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Registered Squads in this Room */}
                        <div className="mt-3">
                          <span className="text-[11px] font-bold text-slate-400 block mb-2">
                            Assigned Squads ({participants.length}):
                          </span>
                          {participants.length === 0 ? (
                            <span className="text-xs text-slate-500 italic block py-2">
                              No squads assigned to this room yet. Auto-assigned sequentially on registration.
                            </span>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                              {participants.map((p: any, pIdx: number) => (
                                <div
                                  key={p.id || pIdx}
                                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-left space-y-1 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[9px] text-purple-400 font-bold">
                                      SLOT #{p.slotNumber || pIdx + 1}
                                    </span>
                                  </div>
                                  <div className="font-bold text-white truncate">{p.squadName}</div>
                                  {p.iglName && (
                                    <div className="text-[10px] text-slate-400 font-mono truncate">
                                      IGL: {p.iglName}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : roomActiveTab === 'POINTS_TABLE' ? (
              /* TAB 4: AI SCOREBOARD SCANNER & POINTS TABLE STUDIO */
              <div className="mt-4 space-y-5">
                {/* 1. Room Selector & Screenshot Upload Box */}
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Scan className="w-4 h-4 text-purple-400" />
                        <span>AI Match Scoreboard Scanner &amp; Points Publisher</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Upload match end scoreboard screenshot &rarr; scan with AI &rarr; review &amp; publish points table.
                      </p>
                    </div>

                    {/* Stage & Room Selectors */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-slate-400 shrink-0">Stage / Round:</label>
                        <select
                          value={selectedScoreboardStage}
                          onChange={(e) => setSelectedScoreboardStage(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl border border-purple-800/80 bg-slate-900 text-purple-300 font-bold text-xs outline-none focus:border-purple-500 cursor-pointer"
                        >
                          {(adminRoadmapConfig?.stages || []).map(stg => (
                            <option key={stg.id} value={stg.name}>{stg.name}</option>
                          ))}
                          <option value="Round 1: Qualifiers">Round 1: Qualifiers</option>
                          <option value="Quarter-Finals">Quarter-Finals</option>
                          <option value="Semi-Finals">Semi-Finals</option>
                          <option value="Grand Finals">Grand Finals</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-slate-400 shrink-0">Room:</label>
                        <select
                          value={selectedScoreboardRoomId}
                          onChange={(e) => setSelectedScoreboardRoomId(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl border border-purple-800/80 bg-slate-900 text-purple-300 font-bold text-xs outline-none focus:border-purple-500 cursor-pointer"
                        >
                          {tournamentRooms.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.roomType === 'FINAL' || r.roomLabel === 'Final' ? '🏆 Final Room' : `Room ${r.roomLabel}`} ({r.currentCount || 0} squads)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <label className="text-xs font-bold text-slate-400 shrink-0">Match #:</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={matchNumberInput}
                          onChange={(e) => setMatchNumberInput(Number(e.target.value) || 1)}
                          className="w-12 px-2 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-center font-bold text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Screenshot Input and Scan Trigger */}
                  <div className="grid gap-4 md:grid-cols-2 items-center">
                    <div>
                      <ImageUploadInput
                        label="Upload Match Scoreboard Screenshot"
                        theme="dark"
                        value={scoreboardImage}
                        onChange={(val) => setScoreboardImage(val)}
                        placeholder="Paste image URL or upload match screenshot"
                        helperText="Gemini Vision reads squad names, placement ranks, and kills automatically."
                      />
                    </div>

                    <div className="flex flex-col justify-center space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-xs text-slate-300 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-brand-gold" />
                          <span>Official Esports Scoring Formula:</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          1st: 12 pts • 2nd: 9 pts • 3rd: 8 pts • 4th: 7 pts • 5th: 6 pts • 6th: 5 pts • 7th: 4 pts • 8th: 3 pts • 9th: 2 pts • 10th: 1 pt + 1 pt per Kill.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleScanScoreboard}
                          disabled={isScanningOCR || !scoreboardImage}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isScanningOCR ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Scanning Scoreboard with AI...</span>
                            </>
                          ) : (
                            <>
                              <Scan className="w-4 h-4" />
                              <span>⚡ Scan Scoreboard with AI</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleAddEditableRow}
                          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
                          title="Add row manually"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Editable Scores Spreadsheet */}
                {editableScores.length > 0 && (
                  <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                          <span>Review &amp; Edit Points Table ({editableScores.length} Squads)</span>
                          {ocrConfidence && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                              AI Confidence: {ocrConfidence}%
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Admin has 100% control: Click any cell to edit team names, placement rank, or kills. Total points calculate automatically.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handlePublishPointsTable}
                        disabled={isSavingPointsTable}
                        className="py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingPointsTable ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Publish Points Table</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 text-[10px]">
                          <tr>
                            <th className="px-3 py-2.5 w-16 text-center">Rank</th>
                            <th className="px-3 py-2.5">Squad Name</th>
                            <th className="px-3 py-2.5 w-28 text-center">Placement Pts</th>
                            <th className="px-3 py-2.5 w-24 text-center">Kills</th>
                            <th className="px-3 py-2.5 w-28 text-center">Total Points</th>
                            <th className="px-3 py-2.5 w-12 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 font-mono">
                          {editableScores.map((score, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/60">
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  max="30"
                                  value={score.rank}
                                  onChange={(e) => handleUpdateEditableScore(idx, 'rank', e.target.value)}
                                  className="w-12 px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-center font-bold text-white"
                                />
                              </td>
                              <td className="px-3 py-2 font-sans font-bold text-white">
                                <input
                                  type="text"
                                  value={score.teamName}
                                  onChange={(e) => handleUpdateEditableScore(idx, 'teamName', e.target.value)}
                                  className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-white outline-none focus:border-purple-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-center text-slate-300 font-bold">
                                {score.placementPoints} pts
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={score.kills}
                                  onChange={(e) => handleUpdateEditableScore(idx, 'kills', e.target.value)}
                                  className="w-16 px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-center font-bold text-red-400 outline-none focus:border-purple-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-brand-gold font-black border border-slate-700 text-sm">
                                  {score.totalPoints}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditableRow(idx)}
                                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. Published Points Tables Archive with Group WhatsApp Broadcast */}
                {adminPointsTables.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-brand-gold" />
                        <span>Published Points Tables ({adminPointsTables.length})</span>
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Broadcast button sends results strictly &amp; ONLY to that group&apos;s squads.
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {adminPointsTables.map(t => (
                        <div key={t.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-800/60">
                              {formatRoomLabel(t.roomLabel)} • Match #{t.matchNumber || 1}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(t.publishedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-300">
                            <span className="text-slate-400 block text-[10px]">Stage: <strong>{t.stage || 'Official Match'}</strong></span>
                            Leader: <strong className="text-brand-gold">{t.scores?.[0]?.teamName || 'N/A'}</strong> ({t.scores?.[0]?.totalPoints || 0} pts)
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => handleBroadcastPointsTable(t)}
                              disabled={isBroadcastingPointsTable === t.id}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              title="Broadcast Points Table exclusively to this group's squads via WhatsApp"
                            >
                              {isBroadcastingPointsTable === t.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                              ) : (
                                <Send className="w-3 h-3 text-emerald-400" />
                              )}
                              <span>Send to Group</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePointsTable(t.id)}
                              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900 border border-red-800 text-red-400 transition-colors cursor-pointer"
                              title="Delete Points Table"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 5: UNIVERSAL STAGE & ROUND ADVANCEMENT ENGINE */
              <div className="mt-4 space-y-5">
                <div className="p-5 rounded-2xl bg-purple-950/40 border border-purple-800/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/60">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-brand-gold" />
                        <span>Universal Stage &amp; Round Advancement Engine</span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Select qualifying squads from previous rounds &rarr; advance them to the next Round (Round 2, 3, Quarter-Finals, Semi-Finals, or Grand Finals).
                      </p>
                    </div>

                    <button
                      onClick={handleAdvanceSelectedSquads}
                      disabled={isAdvancing || selectedAdvancingIds.length === 0}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:brightness-110 text-white text-xs font-black shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      {isAdvancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4 text-brand-gold" />}
                      <span>Advance Selected ({selectedAdvancingIds.length}) &rarr; {advanceTargetStageName}</span>
                    </button>
                  </div>

                  {/* Target Stage & Room Controls */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 p-3.5 rounded-xl bg-slate-950/80 border border-purple-900/60 items-center">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Select Target Next Round / Stage:
                      </label>
                      <select
                        value={advanceTargetStageName}
                        onChange={(e) => setAdvanceTargetStageName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-purple-800 bg-slate-900 text-xs font-bold text-purple-300 outline-none focus:border-purple-500 cursor-pointer"
                      >
                        {(adminRoadmapConfig?.stages || []).map(stg => (
                          <option key={stg.id} value={stg.name}>{stg.name}</option>
                        ))}
                        <option value="Round 2: Group Stage">Round 2: Group Stage</option>
                        <option value="Round 3: Playoffs">Round 3: Playoffs</option>
                        <option value="Quarter-Finals">Quarter-Finals</option>
                        <option value="Semi-Finals">Semi-Finals</option>
                        <option value="Grand Finals">🏆 Grand Finals</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Select Target Room / Group:
                      </label>
                      <select
                        value={advanceTargetRoomId}
                        onChange={(e) => setAdvanceTargetRoomId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-purple-800 bg-slate-900 text-xs font-bold text-white outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="">Auto-Assign / Default Next Room</option>
                        {tournamentRooms.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.roomType === 'FINAL' || r.roomLabel === 'Final' ? '🏆 Final Room' : formatRoomLabel(r.roomLabel, r.roomType)} ({r.currentCount || 0}/{r.capacity || 12})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-4 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => {
                          // Select all non-final squad IDs
                          const allIds = tournamentRooms
                            .filter(r => r.roomType !== 'FINAL')
                            .flatMap(r => ((r as any).participants || []).map((p: any) => p.id));
                          setSelectedAdvancingIds(allIds);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAdvancingIds([])}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-400 transition-colors cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>

                {/* Squads Selector Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80 shadow-xl">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800 text-[10px]">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">Select</th>
                        <th className="px-4 py-3">Source Room</th>
                        <th className="px-4 py-3">Squad Name</th>
                        <th className="px-4 py-3">Captain / IGL</th>
                        <th className="px-4 py-3">WhatsApp</th>
                        <th className="px-4 py-3">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {tournamentRooms
                        .flatMap(r => ((r as any).participants || []).map((p: any) => ({ ...p, roomLabel: r.roomLabel, roomId: r.id, roomType: r.roomType })))
                        .map((squad: any) => {
                          const isSelected = selectedAdvancingIds.includes(squad.id);
                          const isAlreadyFinal = squad.roomType === 'FINAL' || squad.roomLabel === 'Final';

                          return (
                            <tr key={squad.id} className="hover:bg-slate-900/60 transition-colors">
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected || isAlreadyFinal}
                                  disabled={isAlreadyFinal}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAdvancingIds(prev => [...prev, squad.id]);
                                    } else {
                                      setSelectedAdvancingIds(prev => prev.filter(id => id !== squad.id));
                                    }
                                  }}
                                  className="accent-purple-600 rounded cursor-pointer w-4 h-4"
                                />
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-purple-400">
                                {isAlreadyFinal ? '🏆 Final Room' : formatRoomLabel(squad.roomLabel, squad.roomType)}
                              </td>
                              <td className="px-4 py-3 font-bold text-white">
                                {squad.squadName}
                              </td>
                              <td className="px-4 py-3 text-slate-300 font-medium">
                                {squad.iglName || 'N/A'}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-400">
                                {squad.captainWhatsApp || 'N/A'}
                              </td>
                              <td className="px-4 py-3">
                                {isAlreadyFinal ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                                    🏆 In Final Stage
                                  </span>
                                ) : isSelected ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 font-bold text-[10px]">
                                    Selected &rarr; {advanceTargetStageName}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">
                                    Active in {formatRoomLabel(squad.roomLabel, squad.roomType)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

