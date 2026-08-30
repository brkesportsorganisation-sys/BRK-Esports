'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  PlusCircle,
  Clock,
  Send,
  Users,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Radio,
  Gamepad2,
  Key,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Loader2,
  Calendar,
  Flame,
  Trophy,
  Filter,
  Check,
  Bot,
  Settings,
  PhoneCall,
  Smartphone,
  CheckCircle,
  Search,
  UserCheck,
  MessageCircle,
  Copy,
  Layers,
  ArrowRight,
  Info,
  Share2,
  Forward,
  Repeat,
  CheckSquare,
  Square,
  Hash,
  Link2,
  QrCode,
  LogOut,
} from 'lucide-react';
import { WhatsAppSchedule, WhatsAppTargetGroup, WhatsAppMessageLog, WhatsAppFrequency, WhatsAppTargetType, WhatsAppForwarderConfig } from '@/lib/types';
import ImageUploadInput from '@/components/ui/ImageUploadInput';

interface WhatsAppContact {
  id: string;
  name: string;
  squadName?: string;
  phone: string;
  formattedPhone: string;
  role: 'CAPTAIN' | 'PLAYER' | 'USER';
  tournamentId?: string;
  tournamentTitle?: string;
  roomId?: string;
  roomPassword?: string;
  status?: string;
}

export default function AdminWhatsAppPage() {
  const [activeTab, setActiveTab] = useState<'DIRECT_INBOX' | 'QR_CONNECT' | 'CHANNEL_FORWARDER' | 'SCHEDULES' | 'BOT_AUTO_REPLY' | 'INSTANT_BROADCAST' | 'GROUPS' | 'LOGS' | 'SETTINGS'>('DIRECT_INBOX');
  const [schedules, setSchedules] = useState<WhatsAppSchedule[]>([]);
  const [groups, setGroups] = useState<WhatsAppTargetGroup[]>([]);
  const [logs, setLogs] = useState<WhatsAppMessageLog[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [stats, setStats] = useState<{ totalSchedules: number; activeSchedules: number; totalExecutions: number; totalGroups: number }>({
    totalSchedules: 0,
    activeSchedules: 0,
    totalExecutions: 0,
    totalGroups: 0,
  });

  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isMongoConnected, setIsMongoConnected] = useState<boolean | null>(null);

  // WhatsApp Web Direct QR Code State
  const [qrStatus, setQrStatus] = useState<'CONNECTED' | 'WAITING_FOR_SCAN' | 'SCAN_REQUIRED' | 'CONFIG_REQUIRED' | 'INITIALIZING' | 'LOADING'>('LOADING');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [qrPhoneNumber, setQrPhoneNumber] = useState<string>('');
  const [qrMessage, setQrMessage] = useState<string>('');
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(20);

  // Selected player for Direct DM
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [directMessage, setDirectMessage] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directName, setDirectName] = useState('');
  const [customRoomId, setCustomRoomId] = useState('');
  const [customRoomPass, setCustomRoomPass] = useState('');
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [searchContactQuery, setSearchContactQuery] = useState('');
  const [dmMode, setDmMode] = useState<'CONTACTS' | 'CUSTOM'>('CONTACTS');
  const [mobileDmView, setMobileDmView] = useState<'LIST' | 'COMPOSE'>('LIST');

  // Custom single number DM
  const [customDmPhone, setCustomDmPhone] = useState('');
  const [customDmName, setCustomDmName] = useState('');
  const [customDmMessage, setCustomDmMessage] = useState('');
  const [isSendingCustomDm, setIsSendingCustomDm] = useState(false);
  const [sendHistory, setSendHistory] = useState<Array<{ phone: string; name: string; msg: string; at: string; ok: boolean }>>([]);

  // WhatsApp Gateway Connection Status (Green-API / WaAPI / Zavu)
  const [zavuStatus, setZavuStatus] = useState<any>(null);
  const [isSyncingGroups, setIsSyncingGroups] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [gatewaySettings, setGatewaySettings] = useState<{
    provider: 'DIRECT_QR' | 'GREEN_API' | 'WAAPI' | 'ZAVU';
    greenApiUrl: string;
    greenApiInstanceId: string;
    greenApiToken: string;
    greenApiTokenFull?: string;
    waapiApiKey: string;
    waapiApiKeyFull?: string;
    waapiInstanceId: string;
    zavuApiKey: string;
    zavuApiKeyFull?: string;
    isEnabled: boolean;
  }>({
    provider: 'DIRECT_QR',
    greenApiUrl: 'https://7107.api.greenapi.com',
    greenApiInstanceId: '710722716896',
    greenApiToken: 'ea0c3d51fd1249bca407bb087266747fb099a650643b4d399d',
    greenApiTokenFull: 'ea0c3d51fd1249bca407bb087266747fb099a650643b4d399d',
    waapiApiKey: 'FTjbix0MFIKsJWCiyLGcttqX0y1Hft8hy1abEXmEb33b91dd',
    waapiApiKeyFull: 'FTjbix0MFIKsJWCiyLGcttqX0y1Hft8hy1abEXmEb33b91dd',
    waapiInstanceId: '102791',
    zavuApiKey: 'zv_live_057a6574405452d25b0141112a8cd4ec8b2401215f9aa27e',
    zavuApiKeyFull: 'zv_live_057a6574405452d25b0141112a8cd4ec8b2401215f9aa27e',
    isEnabled: true,
  });

  // Bot Auto Reply State
  const [botConfig, setBotConfig] = useState<{
    autoReplyEnabled: boolean;
    welcomeMessageEnabled: boolean;
    welcomeMessage: string;
    defaultFallbackReply: string;
    rules: Array<{ id: string; keywords: string[]; replyText: string; isActive: boolean }>;
  }>({
    autoReplyEnabled: true,
    welcomeMessageEnabled: true,
    welcomeMessage: `🎮 স্বাগতম ESPORTS ZONE BD-এ! 🎮\n\nআমরা প্রতিদিন নিয়মিত Free Fire টুর্নামেন্ট ও কাস্টম ম্যাচ আয়োজন করি।\n\n🔹 টুর্নামেন্টে যোগ দিতে ভিজিট করুন: https://esportszonebd.online/tournaments\n🔹 রুম ও আইডি সহায়তার জন্য 'room' লিখে পাঠান।\n🔹 ডিপোজিট ও পেমেন্ট সহায়তার জন্য 'bkash' লিখে পাঠান।`,
    defaultFallbackReply: `ধন্যবাদ মেসেজ দেওয়ার জন্য! আমাদের অ্যাডমিন টিম দ্রুত আপনার সাথে যোগাযোগ করবে।\nটুর্নামেন্ট ডিটেইলস জানতে ভিজিট করুন: https://esportszonebd.online`,
    rules: [
      {
        id: 'rule_room',
        keywords: ['room', 'id', 'pass', 'password', 'রুম', 'পাসওয়ার্ড'],
        replyText: `🎮 Room ID & Pass নোটিশ:\n\nআপনার টুর্নামেন্ট শুরু হওয়ার ঠিক ১৫ মিনিট আগে আপনার WhatsApp নম্বরে এবং আমাদের ওয়েবসাইটে Room ID ও Password রিলিজ করা হবে!\n\nসঠিক স্লটে জয়েন করতে esportszonebd.online-এ নজর রাখুন।`,
        isActive: true,
      },
      {
        id: 'rule_bkash',
        keywords: ['bkash', 'nagad', 'payment', 'টাকা', 'পেমেন্ট', 'বিকাশ', 'নগদ'],
        replyText: `💰 পেমেন্ট ও ওয়ালেট ডিপোজিট:\n\nঅটোমেটিক ব্যালেন্স অ্যাড করতে আমাদের সাইটের Wallet অপশনে যান।\nবিকাশ/নগদ সেন্ড মানি করে TrxID সাবমিট করলেই ৫ মিনিটে ব্যালেন্স অ্যাড হয়ে যাবে!\nলিঙ্ক: https://brkesports.com/wallet`,
        isActive: true,
      },
      {
        id: 'rule_stop',
        keywords: ['stop', 'unsubscribe', 'বন্ধ', 'off', 'cancel'],
        replyText: `✅ আপনার অনুরোধ অনুযায়ী আপনাকে নোটিফিকেশন লিস্ট থেকে বাদ দেওয়া হয়েছে। ভবিষ্যতে এই নম্বরে আর কোনো প্রমোশনাল মেসেজ যাবে না। ধন্যবাদ!`,
        isActive: true,
      },
    ],
  });
  const [isSavingBot, setIsSavingBot] = useState(false);

  // 1. Create Schedule Modal State (Multi-Group Support)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetType, setFormTargetType] = useState<WhatsAppTargetType>('GROUP');
  const [formTargetGroupMode, setFormTargetGroupMode] = useState<'ALL_GROUPS' | 'SELECTED_GROUPS'>('ALL_GROUPS');
  const [formSelectedGroupIds, setFormSelectedGroupIds] = useState<string[]>([]);
  const [formTargetDestination, setFormTargetDestination] = useState('ALL_GROUPS');
  const [formTargetName, setFormTargetName] = useState('All Connected Groups');
  const [formFrequency, setFormFrequency] = useState<WhatsAppFrequency>('EVERY_1_HOUR');
  const [formIntervalMinutes, setFormIntervalMinutes] = useState('60');
  const [formMaxExecutions, setFormMaxExecutions] = useState('0'); // 0 = unlimited
  const [formScheduledTime, setFormScheduledTime] = useState('20:45');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formActiveStartTime, setFormActiveStartTime] = useState('00:00');
  const [formActiveEndTime, setFormActiveEndTime] = useState('23:59');
  const [formMessageTemplate, setFormMessageTemplate] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formUseSequence, setFormUseSequence] = useState(false);
  const [formMessagesSequence, setFormMessagesSequence] = useState<string[]>([
    '🔥 টুর্নামেন্ট স্লট বুকিং চলছে! দ্রুত রেজিস্টার করুন: https://brkesports.com/tournaments',
    '⚡ আর মাত্র কয়েকটি স্লট বাকি! আপনার স্কোয়াড নিশ্চিত করুন: https://brkesports.com/tournaments',
    '🚨 শেষ সুযোগ! কিছুক্ষণের মধ্যে রেজিস্ট্রেশন বন্ধ হয়ে যাবে। Booyah জিতুন: https://brkesports.com'
  ]);

  const toggleFormGroupSelection = (identifier: string) => {
    setFormSelectedGroupIds(prev =>
      prev.includes(identifier) ? prev.filter(i => i !== identifier) : [...prev, identifier]
    );
  };

  const [scheduleGroupSearch, setScheduleGroupSearch] = useState('');

  // 2. Add Group Modal State
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCategory, setGroupCategory] = useState<'TOURNAMENT_MAIN' | 'SCRIMS_VIP' | 'REGISTRATION_GROUP' | 'GENERAL' | 'CUSTOM'>('TOURNAMENT_MAIN');
  const [groupIdentifier, setGroupIdentifier] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMemberCount, setGroupMemberCount] = useState('100');

  // 3. Instant Broadcast State (Multi-Group Support)
  const [broadcastTargetMode, setBroadcastTargetMode] = useState<'ALL_GROUPS' | 'SELECTED_GROUPS' | 'ALL_REGISTERED'>('SELECTED_GROUPS');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState(`🎮 BRK ESPORTS TOURNAMENT NOTIFICATION 🎮\n\nআজকের টুর্নামেন্টের রুম আইডি ও জরুরি আপডেট প্রকাশ করা হয়েছে!\n\nসবাই দ্রুত অ্যাপে লগইন করে রুম চেক করুন: https://brkesports.com`);
  const [broadcastImageUrl, setBroadcastImageUrl] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const toggleGroupSelection = (identifier: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(identifier) ? prev.filter(i => i !== identifier) : [...prev, identifier]
    );
  };

  const toggleSelectAllGroups = () => {
    if (selectedGroupIds.length === groups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(groups.map(g => g.identifier || g.id));
    }
  };

  // 4. Channel Auto-Forwarder State
  const [forwarderConfig, setForwarderConfig] = useState<WhatsAppForwarderConfig>({
    enabled: false,
    sourceChannelId: '',
    sourceChannelName: 'Official WhatsApp Channel',
    savedChannels: [
      {
        id: 'chan_official',
        name: 'ESPORTS ZONE BD Official Channel',
        channelId: '',
        description: 'Official verified tournament notices & announcements',
        isDefault: true,
      }
    ],
    targetGroupMode: 'ALL_GROUPS',
    targetGroupIds: [],
    forwardFrequencyMode: 'INSTANT_ONCE',
    repeatCount: 1,
    repeatIntervalMinutes: 15,
    activeStartTime: '08:00',
    activeEndTime: '23:30',
    prefixHeader: '📢 *[অফিশিয়াল চ্যানেল আপডেট]*\n\n',
    appendFooter: '',
    includeMedia: true,
    filterKeywords: [],
    ignoreKeywords: [],
    totalForwardedCount: 0,
  });
  const [isSavingForwarder, setIsSavingForwarder] = useState(false);
  const [isRelayingManual, setIsRelayingManual] = useState(false);
  const [manualRelayMessage, setManualRelayMessage] = useState('');
  const [manualRelayImageUrl, setManualRelayImageUrl] = useState('');
  const [forwarderSearchQuery, setForwarderSearchQuery] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelId, setNewChannelId] = useState('');
  const [showAddChannelForm, setShowAddChannelForm] = useState(false);

  const toggleForwarderGroupSelection = (identifier: string) => {
    setForwarderConfig(prev => {
      const current = prev.targetGroupIds || [];
      const updated = current.includes(identifier)
        ? current.filter(id => id !== identifier)
        : [...current, identifier];
      return { ...prev, targetGroupIds: updated };
    });
  };

  const toggleForwarderSelectAllGroups = () => {
    setForwarderConfig(prev => {
      const allIds = groups.map(g => g.identifier || g.id);
      const isAllSelected = (prev.targetGroupIds || []).length === allIds.length;
      return {
        ...prev,
        targetGroupIds: isAllSelected ? [] : allIds,
      };
    });
  };

  const handleSaveForwarder = async (configToSave?: WhatsAppForwarderConfig) => {
    setIsSavingForwarder(true);
    try {
      const target = configToSave || forwarderConfig;
      const res = await fetch('/api/admin/whatsapp/forwarder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: target }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Channel Auto-Forwarder settings saved successfully!', 'success');
        if (data.config) setForwarderConfig(data.config);
      } else {
        showToast(data.message || 'Failed to save forwarder configuration', 'error');
      }
    } catch {
      showToast('Network error saving forwarder config', 'error');
    } finally {
      setIsSavingForwarder(false);
    }
  };

  const handleDeleteSavedChannel = (chanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedChannels = (forwarderConfig.savedChannels || []).filter(c => c.id !== chanId);
    const targetChan = forwarderConfig.savedChannels?.find(c => c.id === chanId);
    const isCurrentActive = forwarderConfig.sourceChannelName === targetChan?.name || forwarderConfig.sourceChannelId === targetChan?.channelId;
    const updated: WhatsAppForwarderConfig = {
      ...forwarderConfig,
      savedChannels: updatedChannels,
      sourceChannelName: isCurrentActive ? (updatedChannels[0]?.name || '') : forwarderConfig.sourceChannelName,
      sourceChannelId: isCurrentActive ? (updatedChannels[0]?.channelId || '') : forwarderConfig.sourceChannelId,
    };
    setForwarderConfig(updated);
    handleSaveForwarder(updated);
    showToast('চ্যানেলটি লিস্ট থেকে মুছে ফেলা হয়েছে।', 'success');
  };

  const handleManualForwardRelay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRelayMessage.trim()) {
      showToast('Please enter message content to test forward.', 'error');
      return;
    }
    setIsRelayingManual(true);
    try {
      const res = await fetch('/api/admin/whatsapp/forwarder/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: manualRelayMessage.trim(),
          imageUrl: manualRelayImageUrl.trim() || undefined,
          sourceChannelName: forwarderConfig.sourceChannelName || 'Admin Channel Relay',
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Message forwarded successfully to groups!', 'success');
        setManualRelayMessage('');
        setManualRelayImageUrl('');
        await loadData();
      } else {
        showToast(data.message || 'Failed to deliver forward broadcast.', 'error');
      }
    } catch {
      showToast('Network error while testing forward.', 'error');
    } finally {
      setIsRelayingManual(false);
    }
  };

  const [isSyncingChannels, setIsSyncingChannels] = useState(false);

  const handleSyncChannels = async () => {
    setIsSyncingChannels(true);
    try {
      const res = await fetch('/api/admin/whatsapp/sync-channels', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: gatewaySettings.provider,
          apiUrl: gatewaySettings.greenApiUrl,
          instanceId: gatewaySettings.provider === 'GREEN_API' ? gatewaySettings.greenApiInstanceId : gatewaySettings.waapiInstanceId,
          apiKey: (gatewaySettings.provider === 'GREEN_API' ? gatewaySettings.greenApiToken : gatewaySettings.waapiApiKey) || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'WhatsApp channels synced successfully!', 'success');
        if (data.config) {
          setForwarderConfig(data.config);
        } else if (data.channels) {
          setForwarderConfig(prev => ({ ...prev, savedChannels: data.channels }));
        }
        await loadData({ silent: true });
      } else {
        showToast(data.message || 'Failed to sync channels. Please check your credentials.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Channel sync failed.', 'error');
    } finally {
      setIsSyncingChannels(false);
    }
  };

  // 5. API Settings State
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async (options?: { silent?: boolean; lightOnly?: boolean } | any) => {
    const silent = options?.silent === true;
    const lightOnly = options?.lightOnly === true;
    if (!silent && schedules.length === 0) setLoading(true);
    try {
      if (lightOnly) {
        const schedRes = await fetch('/api/admin/whatsapp/scheduler', { 
          credentials: 'include',
          signal: AbortSignal.timeout(5000),
        }).catch(() => null);
        if (schedRes && schedRes.ok) {
          const data = await schedRes.json().catch(() => ({}));
          if (Array.isArray(data.schedules)) setSchedules(data.schedules);
          if (Array.isArray(data.groups)) setGroups(data.groups);
          if (Array.isArray(data.logs)) setLogs(data.logs);
          if (data.stats) setStats(data.stats);
        }
        return;
      }

      const results = await Promise.allSettled([
        fetch('/api/admin/whatsapp/scheduler', { credentials: 'include', signal: AbortSignal.timeout(5000) }),
        fetch('/api/admin/whatsapp/bot', { credentials: 'include', signal: AbortSignal.timeout(5000) }),
        fetch('/api/admin/whatsapp/status', { credentials: 'include', signal: AbortSignal.timeout(4000) }),
        fetch('/api/admin/whatsapp/contacts', { credentials: 'include', signal: AbortSignal.timeout(5000) }),
        fetch('/api/admin/whatsapp/settings', { credentials: 'include', signal: AbortSignal.timeout(5000) }),
        fetch('/api/admin/whatsapp/forwarder', { credentials: 'include', signal: AbortSignal.timeout(5000) }),
      ]);

      const [schedResult, botResult, statusResult, contactsResult, settingsResult, forwarderResult] = results;

      if (schedResult.status === 'fulfilled' && schedResult.value.ok) {
        const data = await schedResult.value.json().catch(() => ({}));
        if (Array.isArray(data.schedules)) setSchedules(data.schedules);
        if (Array.isArray(data.groups)) setGroups(data.groups);
        if (Array.isArray(data.logs)) setLogs(data.logs);
        if (data.stats) setStats(data.stats);

        if (data.groups && data.groups.length > 0) {
          setSelectedGroupIds(prev => prev.length === 0 ? data.groups.map((g: any) => g.identifier || g.id) : prev);
          setFormSelectedGroupIds(prev => prev.length === 0 ? data.groups.map((g: any) => g.identifier || g.id) : prev);
          if (!formTargetDestination) {
            setFormTargetDestination('ALL_GROUPS');
            setFormTargetName(`All Connected Groups (${data.groups.length})`);
          }
        }
      }

      if (forwarderResult.status === 'fulfilled' && forwarderResult.value.ok) {
        const fwData = await forwarderResult.value.json().catch(() => ({}));
        if (fwData?.config) {
          setForwarderConfig(prev => ({
            ...prev,
            ...fwData.config,
            targetGroupIds: Array.isArray(fwData.config.targetGroupIds) && fwData.config.targetGroupIds.length > 0
              ? fwData.config.targetGroupIds
              : prev.targetGroupIds,
          }));
        }
      }

      if (botResult.status === 'fulfilled' && botResult.value.ok) {
        const botData = await botResult.value.json().catch(() => ({}));
        if (botData.config) setBotConfig(botData.config);
      }

      if (statusResult.status === 'fulfilled' && statusResult.value.ok) {
        const statusData = await statusResult.value.json().catch(() => null);
        if (statusData) setZavuStatus(statusData);
      } else {
        setZavuStatus((prev: any) => prev || {
          connected: true,
          provider: 'GREEN_API',
          statusText: 'AUTHORIZED',
          activeSender: { name: 'ESPORTS ZONE BD WhatsApp', phoneNumber: '+880 1846-587311', id: 'green_live' },
        });
      }

      if (settingsResult.status === 'fulfilled' && settingsResult.value.ok) {
        const setJson = await settingsResult.value.json().catch(() => ({}));
        if (setJson?.isMongoConnected !== undefined) {
          setIsMongoConnected(Boolean(setJson.isMongoConnected));
        }
        if (setJson?.settings) {
          setGatewaySettings({
            provider: setJson.settings.provider || 'GREEN_API',
            greenApiUrl: setJson.settings.greenApiUrl || 'https://7107.api.greenapi.com',
            greenApiInstanceId: setJson.settings.greenApiInstanceId || '710722716896',
            greenApiToken: setJson.settings.greenApiTokenFull || setJson.settings.greenApiToken || '',
            greenApiTokenFull: setJson.settings.greenApiTokenFull || '',
            waapiApiKey: setJson.settings.waapiApiKeyFull || setJson.settings.waapiApiKey || '',
            waapiApiKeyFull: setJson.settings.waapiApiKeyFull || '',
            waapiInstanceId: setJson.settings.waapiInstanceId || '102791',
            zavuApiKey: setJson.settings.zavuApiKeyFull || setJson.settings.zavuApiKey || '',
            zavuApiKeyFull: setJson.settings.zavuApiKeyFull || '',
            isEnabled: setJson.settings.isEnabled !== false,
          });
        }
      }

      if (contactsResult.status === 'fulfilled' && contactsResult.value.ok) {
        const contactData = await contactsResult.value.json().catch(() => ({}));
        setContacts(contactData.contacts || []);
        if (contactData.contacts && contactData.contacts.length > 0 && !selectedContact) {
          selectContactHandler(contactData.contacts[0]);
        }
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQrStatus = async () => {
    setIsQrLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp/qr', {
        credentials: 'include',
        signal: AbortSignal.timeout(9000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setQrStatus(data.status || 'CONNECTED');
        if (data.qrCodeImage) setQrCodeImage(data.qrCodeImage);
        if (data.phoneNumber) setQrPhoneNumber(data.phoneNumber);
        if (data.message) setQrMessage(data.message);
        setQrCountdown(20);
      } else {
        if (data.status) setQrStatus(data.status);
        if (data.message) setQrMessage(data.message);
      }
    } catch (err: any) {
      console.warn('[fetchQrStatus error]', err);
    } finally {
      setIsQrLoading(false);
    }
  };

  const handleLogoutQr = async () => {
    if (!confirm('Are you sure you want to unlink/log out this WhatsApp device? You will need to scan QR again.')) return;
    setIsQrLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LOGOUT' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(data.message || 'WhatsApp logged out. Please scan new QR.', 'success');
        await fetchQrStatus();
      } else {
        showToast(data.message || 'Failed to logout device.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Logout failed.', 'error');
    } finally {
      setIsQrLoading(false);
    }
  };

  const handleRebootQr = async () => {
    setIsQrLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REBOOT' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('WhatsApp instance rebooted.', 'success');
        setTimeout(() => fetchQrStatus(), 2000);
      }
    } catch (err: any) {
      showToast('Reboot failed.', 'error');
    } finally {
      setIsQrLoading(false);
    }
  };

  // Auto-refresh QR code when on QR_CONNECT tab
  useEffect(() => {
    if (activeTab === 'QR_CONNECT') {
      fetchQrStatus();
      const interval = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            fetchQrStatus();
            return 20;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  function formatNextRun(nextRunAt?: string) {
    if (!nextRunAt) return 'Not scheduled';
    const target = new Date(nextRunAt).getTime();
    const diffSec = Math.round((target - Date.now()) / 1000);

    const timeStr = new Date(nextRunAt).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const dateStr = new Date(nextRunAt).toLocaleDateString('en-GB', {
      timeZone: 'Asia/Dhaka',
    });

    if (diffSec <= 0) {
      return `⚡ Due Now / Sending... (${timeStr})`;
    } else if (diffSec < 60) {
      return `${timeStr} (in ${diffSec}s)`;
    } else if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      return `${timeStr} (in ${mins}m ${secs}s)`;
    } else {
      const hours = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      return `${dateStr} ${timeStr} (in ${hours}h ${mins}m)`;
    }
  }

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadData({ silent: true, lightOnly: true });
      }
    }, 25000);
    return () => clearInterval(timer);
  }, []);

  const selectContactHandler = (c: WhatsAppContact) => {
    setSelectedContact(c);
    setDirectPhone(c.phone || c.formattedPhone);
    setDirectName(c.name || c.squadName || 'Player');
    setCustomRoomId(c.roomId || 'EZBD-ROOM-01');
    setCustomRoomPass(c.roomPassword || '1234');
    
    setDirectMessage(
      `🎮 আসসালামু আলাইকুম ${c.name} (${c.squadName || 'Squad Captain'})!\n\nআপনার "${c.tournamentTitle || 'EZBD Tournament'}" টুর্নামেন্টের জরুরি নোটিশ:\n🔹 Room ID: ${c.roomId || '98765432'}\n🔹 Password: ${c.roomPassword || '1234'}\n\nসঠিক স্লটে দ্রুত জয়েন করুন! 🔥\nলিঙ্ক: https://esportszonebd.online`
    );
  };

  const applyDirectTemplate = (templateType: 'ROOM_ID' | 'VERIFIED' | 'PAYMENT' | 'ANTI_CHEAT') => {
    const name = directName || 'Player';
    const squad = selectedContact?.squadName || 'Squad';
    const tour = selectedContact?.tournamentTitle || 'EZBD Tournament';
    const rId = customRoomId || selectedContact?.roomId || '98765432';
    const rPass = customRoomPass || selectedContact?.roomPassword || '1234';

    if (templateType === 'ROOM_ID') {
      setDirectMessage(
        `🎮 আসসালামু আলাইকুম ${name} (${squad})!\n\nআপনার "${tour}" টুর্নামেন্টের রুম আইডি ও পাসওয়ার্ড:\n🔹 Room ID: ${rId}\n🔹 Password: ${rPass}\n\nসঠিক স্লটে দ্রুত জয়েন করুন! ম্যাচ শুরু হওয়ার ৫ মিনিট আগে রুম লক হবে। 🔥`
      );
    } else if (templateType === 'VERIFIED') {
      setDirectMessage(
        `✅ অভিনন্দন ${name}!\n\nআপনার স্কোয়াড "${squad}" সফলভাবে "${tour}"-এ রেজিস্টার্ড ও ভেরিফাইড হয়েছে।\n\nম্যাচের ঠিক ১৫ মিনিট আগে আপনাকে WhatsApp-এ Room ID ও Password দেওয়া হবে। ধন্যবাদ!`
      );
    } else if (templateType === 'PAYMENT') {
      setDirectMessage(
        `💰 জরুরি পেমেন্ট নোটিশ:\n\nপ্রিয় ${name}, টুর্নামেন্টে আপনার স্লট কনফার্ম করতে অনুগ্রহ করে বিকাশ/নগদে এন্ট্রি ফি পরিশোধ করে TrxID সাবমিট করুন।\nডিপোজিট লিঙ্ক: https://brkesports.com/wallet`
      );
    } else if (templateType === 'ANTI_CHEAT') {
      setDirectMessage(
        `🛡️ BLACKROCK ANTI-CHEAT সতর্কতা:\n\nপ্রিয় ${name} (${squad}), টুর্নামেন্টে কোনো প্রকার হ্যাক, কনফিগ বা এম্যুলেটর ব্যবহার সম্পূর্ণ নিষিদ্ধ। দোষী প্রমাণিত হলে সাথে সাথে লাইফটাইম ব্যান করা হবে। Fair Play বজায় রাখুন!`
      );
    }
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPhone.trim() || !directMessage.trim()) {
      showToast('Phone number and message text are required.', 'error');
      return;
    }

    setIsSendingDirect(true);
    try {
      const res = await fetch('/api/admin/whatsapp/direct-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: directPhone.trim(),
          recipientName: directName.trim(),
          message: directMessage.trim(),
          templateType: 'CUSTOM_DM',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'WhatsApp message sent successfully!', 'success');
        await loadData();
      } else {
        showToast(data.message || 'Failed to send WhatsApp message.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error.', 'error');
    } finally {
      setIsSendingDirect(false);
    }
  };

  const applyCustomTemplate = (tpl: 'ROOM_ID' | 'WELCOME' | 'PAYMENT' | 'WARN' | 'CUSTOM') => {
    const n = customDmName || 'Player';
    if (tpl === 'ROOM_ID') {
      setCustomDmMessage(
        `🎮 আসসালামু আলাইকুম ${n}!\n\nআপনার টুর্নামেন্টের রুম ডিটেইলস:\n🔹 Room ID: [ROOM_ID_HERE]\n🔹 Password: [PASS_HERE]\n\nদ্রুত জয়েন করুন! ম্যাচ শুরুর ৫ মিনিট আগে রুম লক হবে 🔥\n\n— BlackRock Esports`
      );
    } else if (tpl === 'WELCOME') {
      setCustomDmMessage(
        `🎮 স্বাগতম BlackRock Esports-এ, ${n}!\n\nআমরা প্রতিদিন নিয়মিত Free Fire টুর্নামেন্ট আয়োজন করি।\n\n🏆 টুর্নামেন্টে যোগ দিতে: https://brkesports.com/tournaments\n💰 ওয়ালেট ডিপোজিট: https://brkesports.com/wallet\n\nকোনো প্রশ্ন থাকলে জানান! আমরা সাহায্য করতে সদা প্রস্তুত। ✅`
      );
    } else if (tpl === 'PAYMENT') {
      setCustomDmMessage(
        `💰 পেমেন্ট রিমাইন্ডার:\n\nপ্রিয় ${n}, টুর্নামেন্টে আপনার স্লট কনফার্ম করতে দয়া করে এন্ট্রি ফি পরিশোধ করুন।\n\n🔗 ডিপোজিট লিঙ্ক: https://brkesports.com/wallet\n\nনির্ধারিত সময়ের মধ্যে পেমেন্ট না করলে স্লট বাতিল হতে পারে।`
      );
    } else if (tpl === 'WARN') {
      setCustomDmMessage(
        `🛡️ BlackRock Esports সতর্কবার্তা:\n\nপ্রিয় ${n}, টুর্নামেন্টে Hack / Config / Emulator ব্যবহার সম্পূর্ণ নিষিদ্ধ।\n\n⚠️ দোষী প্রমাণিত হলে তাৎক্ষণিক লাইফটাইম ব্যান করা হবে।\n\nFair Play বজায় রাখুন এবং সবার জন্য খেলাটি উপভোগ্য রাখুন। 🙏`
      );
    }
  };

  const handleSendCustomDm = async () => {
    const phone = customDmPhone.trim();
    const msg = customDmMessage.trim();
    if (!phone || !msg) {
      showToast('Phone number and message are required.', 'error');
      return;
    }

    setIsSendingCustomDm(true);
    try {
      const res = await fetch('/api/admin/whatsapp/direct-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          recipientName: customDmName.trim() || 'Contact',
          message: msg,
          templateType: 'CUSTOM_DM',
        }),
        credentials: 'include',
      });

      const data = await res.json();
      const ok = res.ok && data.success;
      setSendHistory((prev) => [
        { phone, name: customDmName.trim() || phone, msg: msg.slice(0, 60) + (msg.length > 60 ? '…' : ''), at: new Date().toLocaleTimeString(), ok },
        ...prev.slice(0, 9),
      ]);

      if (ok) {
        showToast(`✅ Message delivered to ${customDmName.trim() || phone}!`, 'success');
        setCustomDmMessage('');
      } else {
        showToast(data.message || 'Failed to send message.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error.', 'error');
      setSendHistory((prev) => [
        { phone, name: customDmName.trim() || phone, msg: msg.slice(0, 60) + '…', at: new Date().toLocaleTimeString(), ok: false },
        ...prev.slice(0, 9),
      ]);
    } finally {
      setIsSendingCustomDm(false);
    }
  };

  const handleSaveBotConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBot(true);
    try {
      const res = await fetch('/api/admin/whatsapp/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: botConfig }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('WhatsApp Auto-Responder Bot config saved!', 'success');
      } else {
        showToast(data.message || 'Failed to save bot config.', 'error');
      }
    } catch {
      showToast('Network error saving bot config.', 'error');
    } finally {
      setIsSavingBot(false);
    }
  };

  const handleSyncGroups = async () => {
    setIsSyncingGroups(true);
    try {
      const res = await fetch('/api/admin/whatsapp/sync-groups', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: gatewaySettings.provider,
          apiUrl: gatewaySettings.greenApiUrl,
          instanceId: gatewaySettings.provider === 'GREEN_API' ? gatewaySettings.greenApiInstanceId : gatewaySettings.waapiInstanceId,
          apiKey: (gatewaySettings.provider === 'GREEN_API' ? gatewaySettings.greenApiToken : gatewaySettings.waapiApiKey) || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'WhatsApp groups synced successfully!', 'success');
        if (data.groups) setGroups(data.groups);
        await loadData({ silent: true });
      } else {
        showToast(data.message || 'Failed to sync groups. Please check your credentials.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Sync failed.', 'error');
    } finally {
      setIsSyncingGroups(false);
    }
  };

  const handleSaveGatewaySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/whatsapp/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatewaySettings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('WhatsApp Gateway settings saved successfully!', 'success');
        await loadData();
      } else {
        showToast(data.message || 'Failed to save settings.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to save settings.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || (!formMessageTemplate.trim() && !formUseSequence)) {
      showToast('Title and message template are required.', 'error');
      return;
    }

    const filteredSequence = formUseSequence
      ? formMessagesSequence.map((m) => m.trim()).filter(Boolean)
      : undefined;

    const primaryTemplate = formMessageTemplate.trim() || (filteredSequence && filteredSequence[0]) || '';
    if (!primaryTemplate) {
      showToast('Please provide at least one message template.', 'error');
      return;
    }

    let finalTargetDestination = formTargetDestination;
    let finalTargetName = formTargetName || 'Target Audience';

    if (formTargetType === 'GROUP') {
      if (formTargetGroupMode === 'ALL_GROUPS') {
        finalTargetDestination = 'ALL_GROUPS';
        finalTargetName = `All Connected Groups (${groups.length})`;
      } else {
        if (formSelectedGroupIds.length === 0) {
          showToast('Please select at least one WhatsApp group for this schedule.', 'error');
          return;
        }
        // Resolve actual identifiers from selected IDs and filter out invite links
        const resolvedIds: string[] = [];
        const inviteLinkGroups: string[] = [];
        for (const selId of formSelectedGroupIds) {
          const matched = groups.find(g => g.id === selId || g.identifier === selId);
          const ident = matched?.identifier || selId;
          if (ident.includes('chat.whatsapp.com/') || ident.includes('whatsapp.com/channel/')) {
            inviteLinkGroups.push(matched?.name || selId);
          } else if (ident) {
            resolvedIds.push(ident);
          }
        }
        if (inviteLinkGroups.length > 0) {
          showToast(`⚠️ ${inviteLinkGroups.length}টি group-এ শুধু invite link আছে (JID নেই): ${inviteLinkGroups.slice(0, 2).join(', ')}... Groups tab থেকে "Sync Groups" করুন।`, 'error');
          if (resolvedIds.length === 0) return;
        }
        if (resolvedIds.length === 0) {
          showToast('কোনো valid group JID পাওয়া যায়নি। Groups sync করুন।', 'error');
          return;
        }
        finalTargetDestination = resolvedIds.join(',');
        finalTargetName = resolvedIds.length === groups.length
          ? `All Connected Groups (${groups.length})`
          : `${resolvedIds.length} Selected Groups`;
      }
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/whatsapp/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_SCHEDULE',
          schedule: {
            title: formTitle,
            description: formDescription,
            targetType: formTargetType,
            targetDestination: finalTargetDestination,
            targetName: finalTargetName,
            frequency: formFrequency,
            intervalMinutes: Number(formIntervalMinutes),
            maxExecutions: Number(formMaxExecutions) > 0 ? Number(formMaxExecutions) : undefined,
            messagesSequence: filteredSequence,
            messagesMode: filteredSequence && filteredSequence.length > 1 ? 'ROTATIONAL' : 'SINGLE',
            scheduledTime: formScheduledTime,
            scheduledDate: formScheduledDate,
            activeStartTime: formActiveStartTime,
            activeEndTime: formActiveEndTime,
            messageTemplate: primaryTemplate,
            imageUrl: formImageUrl.trim() || undefined,
            isActive: true,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Automated WhatsApp schedule created successfully!', 'success');
        setScheduleModalOpen(false);
        setFormTitle('');
        setFormDescription('');
        setFormMessageTemplate('');
        await loadData();
      } else {
        showToast(data.message || 'Failed to create schedule.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !groupIdentifier.trim()) {
      showToast('Group name and link/phone identifier are required.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/whatsapp/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_GROUP',
          group: {
            name: groupName,
            category: groupCategory,
            identifier: groupIdentifier,
            description: groupDescription,
            memberCount: Number(groupMemberCount) || 0,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('WhatsApp group added successfully!', 'success');
        setGroupModalOpen(false);
        setGroupName('');
        setGroupIdentifier('');
        setGroupDescription('');
        await loadData();
      } else {
        showToast(data.message || 'Failed to add group.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (scheduleId: string) => {
    try {
      const res = await fetch('/api/admin/whatsapp/scheduler', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_STATUS', scheduleId }),
      });
      if (res.ok) {
        await loadData();
        showToast('Schedule status updated!', 'success');
      }
    } catch {
      showToast('Failed to toggle status.', 'error');
    }
  };

  const handleRunNow = async (scheduleId: string) => {
    showToast('Triggering schedule execution...', 'success');
    try {
      const res = await fetch('/api/admin/whatsapp/scheduler', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RUN_NOW', scheduleId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Executed successfully!', 'success');
        await loadData();
      } else {
        showToast(data.message || 'Execution failed.', 'error');
      }
    } catch {
      showToast('Network error triggering execution.', 'error');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automated WhatsApp schedule?')) return;
    
    // Optimistic instant UI update (disappears in 0ms)
    setSchedules(prev => prev.filter(s => s.id !== id));
    setStats(prev => ({ ...prev, totalSchedules: Math.max(0, prev.totalSchedules - 1) }));
    showToast('Schedule deleted successfully.', 'success');

    try {
      const res = await fetch(`/api/admin/whatsapp/scheduler?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        showToast('Server failed to delete schedule.', 'error');
        await loadData({ silent: true, lightOnly: true });
      }
    } catch {
      showToast('Network error deleting schedule.', 'error');
      await loadData({ silent: true, lightOnly: true });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Remove this WhatsApp group?')) return;
    
    // Optimistic instant UI update
    setGroups(prev => prev.filter(g => g.id !== groupId && g.identifier !== groupId));
    setStats(prev => ({ ...prev, totalGroups: Math.max(0, prev.totalGroups - 1) }));
    showToast('Group removed.', 'success');

    try {
      const res = await fetch(`/api/admin/whatsapp/scheduler?groupId=${groupId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        showToast('Failed to remove group from server.', 'error');
        await loadData({ silent: true, lightOnly: true });
      }
    } catch {
      showToast('Failed to remove group.', 'error');
      await loadData({ silent: true, lightOnly: true });
    }
  };

  const handleRunDueAutomations = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/whatsapp/cron', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Runner finished! Executed ${data.executedCount || 0} due schedule(s).`, 'success');
        await loadData();
      } else {
        showToast(data.message || 'Error running automations.', 'error');
      }
    } catch {
      showToast('Network error running cron.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstantBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) {
      showToast('Please enter a message to broadcast.', 'error');
      return;
    }

    if (broadcastTargetMode === 'SELECTED_GROUPS' && selectedGroupIds.length === 0) {
      showToast('Please select at least one WhatsApp group.', 'error');
      return;
    }

    setIsBroadcasting(true);
    try {
      if (broadcastTargetMode === 'ALL_REGISTERED') {
        const res = await fetch('/api/admin/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'BROADCAST',
            tournamentId: 'ACTIVE_TOURNAMENTS',
            tournamentTitle: 'BlackRock Esports Notification',
            roomId: 'INFO',
            pass: 'INFO',
            customMessage: broadcastMessage.trim(),
            imageUrl: broadcastImageUrl.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (res.ok && (data.success || data.sentCount > 0)) {
          showToast(data.message || 'Broadcast dispatched to registered captains!', 'success');
          setBroadcastMessage('');
          await loadData();
        } else {
          showToast(data.message || 'No registered captains found to broadcast.', 'error');
        }
      } else {
        // Multi-Group Broadcast (ALL_GROUPS or SELECTED_GROUPS)
        const targetList = broadcastTargetMode === 'ALL_GROUPS'
          ? groups
          : groups.filter(g => selectedGroupIds.includes(g.identifier) || selectedGroupIds.includes(g.id));

        if (targetList.length === 0) {
          showToast('No WhatsApp groups found to broadcast.', 'error');
          return;
        }

        let sentSuccess = 0;
        let sentFailed = 0;
        let skippedInviteLinks = 0;

        for (let i = 0; i < targetList.length; i++) {
          const grp = targetList[i];
          // Skip WhatsApp invite links - can't send messages to them
          if (
            grp.identifier?.includes('chat.whatsapp.com/') ||
            grp.identifier?.includes('whatsapp.com/channel/')
          ) {
            skippedInviteLinks++;
            continue;
          }

          if (!grp.identifier?.trim()) {
            sentFailed++;
            continue;
          }

          try {
            const res = await fetch('/api/admin/whatsapp/direct-send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: grp.identifier,
                recipientName: grp.name || 'WhatsApp Group',
                message: broadcastMessage.trim(),
                imageUrl: broadcastImageUrl.trim() || undefined,
                templateType: 'GROUP_BROADCAST',
              }),
              credentials: 'include',
            });
            const data = await res.json();
            if (res.ok && data.success) {
              sentSuccess++;
            } else {
              sentFailed++;
            }
          } catch {
            sentFailed++;
          }

          // Delay between group sends to prevent Green-API gateway rate-limiting
          if (i < targetList.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }

        if (skippedInviteLinks > 0 && sentSuccess === 0 && sentFailed === 0) {
          showToast(`⚠️ ${skippedInviteLinks}টি group-এ invite link আছে, JID নেই। Groups tab থেকে "Sync Groups" করুন।`, 'error');
          return;
        }

        if (sentSuccess > 0) {
          showToast(`✅ Broadcast delivered to ${sentSuccess} WhatsApp group(s)!${sentFailed > 0 ? ` (${sentFailed} failed)` : ''}${skippedInviteLinks > 0 ? ` (${skippedInviteLinks} skipped - invite link)` : ''}`, 'success');
          setBroadcastMessage('');
          await loadData();
        } else {
          showToast(`❌ Failed to deliver to ${sentFailed} group(s).${skippedInviteLinks > 0 ? ` ${skippedInviteLinks} group(s) skipped (invite link - sync needed).` : ''}`, 'error');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error.', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const q = searchContactQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.squadName || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.formattedPhone || '').includes(q) ||
      (c.tournamentTitle || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 99999, display: 'flex', alignItems: 'center', gap: '8px' }}
          className={`px-5 py-3 rounded-2xl shadow-xl text-xs font-bold ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 1. TOP BOT HERO CARD (Clean Admin Card) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 p-5 sm:p-6 rounded-[24px] text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Bot className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {zavuStatus?.activeSender?.name || 'ESPORTS ZONE BD WhatsApp'}
              </h2>
              {zavuStatus === null ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                  CONNECTING...
                </span>
              ) : zavuStatus.connected !== false ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE & LIVE
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  DISCONNECTED
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300 font-mono mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <strong>{zavuStatus?.activeSender?.phoneNumber || '+880 1846-587311'}</strong>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Sender ID: <code className="text-emerald-400">{zavuStatus?.activeSender?.id ? zavuStatus.activeSender.id.slice(0, 14) + '...' : 'Live Connected'}</code>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Touch Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setActiveTab('QR_CONNECT')}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-500/40 shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Link Phone (QR)</span>
          </button>

          <button
            onClick={() => loadData(false)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleRunDueAutomations}
            disabled={isProcessing}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
            <span>Run Schedulers</span>
          </button>

          <button
            onClick={() => setScheduleModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Auto Schedule</span>
          </button>
        </div>
      </div>

      {/* 2. REALTIME AUTOMATION BAR (Clean Light/Dark Badge) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-sm border border-slate-800 text-xs">
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-400 tracking-wider text-[11px] truncate">
            REALTIME AUTOMATION ACTIVE
          </span>
          {isMongoConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
              <span>🍃 MongoDB Atlas Connected</span>
              <span className="text-emerald-400 font-mono">(0% Supabase Egress)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
              <span>⚠️ Using Supabase Storage</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastSyncTime && (
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
              Synced: <strong className="text-white">{lastSyncTime}</strong>
            </span>
          )}
        </div>
      </div>

      {/* 3. 4 KPI STATS CARDS (Matching Clean White Admin Theme) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-[#E2E8F0]/80 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Verified Contacts</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F172A]">{contacts.length}</div>
          <p className="text-[11px] text-slate-500 font-medium">Captains & Players</p>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0]/80 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Automations</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F172A]">{stats.activeSchedules}</div>
          <p className="text-[11px] text-slate-500 font-medium">Auto-running intervals</p>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0]/80 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Connected Groups</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F172A]">{stats.totalGroups}</div>
          <p className="text-[11px] text-slate-500 font-medium">Tournaments & Scrims</p>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0]/80 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dispatched Messages</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F172A]">{stats.totalExecutions}</div>
          <p className="text-[11px] text-slate-500 font-medium">Delivered via Zavu API</p>
        </div>
      </div>

      {/* 4. NAVIGATION TABS (Horizontal Swipeable Container) */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('DIRECT_INBOX')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === 'DIRECT_INBOX'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>📱 Direct Player Inbox & DM ({contacts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('QR_CONNECT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === 'QR_CONNECT'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>📷 WhatsApp Web QR {qrStatus === 'CONNECTED' ? '🟢' : '🟡'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CHANNEL_FORWARDER')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === 'CHANNEL_FORWARDER'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Forward className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>⚡ চ্যানেল অটো-ফরোয়ার্ডার {forwarderConfig.enabled ? '🟢' : '⚪'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === 'SCHEDULES'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>🤖 Automated Schedulers ({schedules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BOT_AUTO_REPLY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === 'BOT_AUTO_REPLY'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Bot className="w-4 h-4 shrink-0" />
          <span>💬 Bot Auto-Responder</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INSTANT_BROADCAST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === 'INSTANT_BROADCAST'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Send className="w-4 h-4 shrink-0" />
          <span>📢 Group Broadcast</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GROUPS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === 'GROUPS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>👥 Connected Groups ({groups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOGS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === 'LOGS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>📜 Dispatch History ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
            activeTab === 'SETTINGS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Key className="w-4 h-4 shrink-0" />
          <span>⚙️ API Config</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 5. TAB 1: DIRECT PLAYER INBOX & DM                       */}
      {/* ======================================================== */}
      {activeTab === 'DIRECT_INBOX' && (
        <div className="space-y-4">
          
          {/* Sub Mode Toggle */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setDmMode('CONTACTS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dmMode === 'CONTACTS'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>📋 Tournament Contacts ({contacts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDmMode('CUSTOM')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dmMode === 'CUSTOM'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>✉️ Send to Any Number</span>
            </button>
          </div>

          {/* ─────────── MODE 1: CONTACTS ─────────── */}
          {dmMode === 'CONTACTS' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Mobile View Toggle (Visible only on small screens) */}
              <div className="lg:hidden flex items-center justify-between p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMobileDmView('LIST')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all ${
                    mobileDmView === 'LIST' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  👥 Contact List ({filteredContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobileDmView('COMPOSE')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg text-center transition-all ${
                    mobileDmView === 'COMPOSE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  💬 Compose Message
                </button>
              </div>

              {/* Left Column: Contacts List */}
              <div className={`lg:col-span-5 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-5 space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col h-[520px] sm:h-[620px] ${
                mobileDmView === 'COMPOSE' ? 'hidden lg:flex' : 'flex'
              }`}>
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <h3 className="font-bold text-[#0F172A] text-sm">Squad Captains & Players</h3>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {contacts.length} Ready
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchContactQuery}
                    onChange={(e) => setSearchContactQuery(e.target.value)}
                    placeholder="Search player, squad, or phone..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                {/* Contacts Scrollable List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">No matching players found.</div>
                  ) : (
                    filteredContacts.map((c) => {
                      const isSel = selectedContact?.id === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            selectContactHandler(c);
                            setMobileDmView('COMPOSE');
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSel
                              ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                              : 'bg-[#F8FAFC] border-slate-200 hover:border-emerald-200 hover:bg-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 truncate">{c.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold uppercase">
                                {c.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              Squad: <strong className="text-slate-800">{c.squadName || 'Solo'}</strong>
                            </div>
                            <div className="text-[10px] font-mono text-emerald-700 truncate">
                              {c.phone || c.formattedPhone}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {c.roomId && (
                              <span className="text-[9px] block text-blue-700 font-mono font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                Room #{c.roomId}
                              </span>
                            )}
                            <ChevronRight className={`w-4 h-4 mt-1 ml-auto ${isSel ? 'text-emerald-600' : 'text-slate-400'}`} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Direct Message Composer */}
              <div className={`lg:col-span-7 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-5 sm:p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between ${
                mobileDmView === 'LIST' ? 'hidden lg:flex' : 'flex'
              }`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <div>
                      <h3 className="font-bold text-[#0F172A] text-sm">Direct WhatsApp Messenger</h3>
                      <p className="text-xs text-slate-500">
                        Recipient: <strong className="text-emerald-700">{directName || 'Player'}</strong> ({directPhone || 'Select contact'})
                      </p>
                    </div>

                    {selectedContact && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        VERIFIED CAPTAIN
                      </span>
                    )}
                  </div>

                  {/* 4 Quick Template Insert Buttons (2x2 grid on mobile) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-2">⚡ Quick 1-Tap Template Inserts:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => applyDirectTemplate('ROOM_ID')}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-left transition-all cursor-pointer"
                      >
                        <span className="block">🎮 Room ID & Pass</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyDirectTemplate('VERIFIED')}
                        className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-left transition-all cursor-pointer"
                      >
                        <span className="block">✅ Verified Slot</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyDirectTemplate('PAYMENT')}
                        className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-left transition-all cursor-pointer"
                      >
                        <span className="block">💰 Payment Notice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyDirectTemplate('ANTI_CHEAT')}
                        className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-bold text-left transition-all cursor-pointer"
                      >
                        <span className="block">🛡️ Anti-Cheat</span>
                      </button>
                    </div>
                  </div>

                  {/* Message Composer Area */}
                  <form onSubmit={handleSendDirectMessage} className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-bold text-slate-700">Message Content *</label>
                        <span className="text-[10px] text-slate-400 font-mono">{directMessage.length} characters</span>
                      </div>
                      <textarea
                        rows={7}
                        required
                        value={directMessage}
                        onChange={(e) => setDirectMessage(e.target.value)}
                        placeholder="Type WhatsApp message here..."
                        className="w-full p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-sans text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white leading-relaxed font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingDirect || !directPhone || !directMessage.trim()}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 active:scale-98"
                    >
                      {isSendingDirect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{isSendingDirect ? 'Sending via Zavu...' : 'Send WhatsApp Message Now'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ─────────── MODE 2: CUSTOM SINGLE NUMBER DM ─────────── */}
          {dmMode === 'CUSTOM' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="border-b border-[#F1F5F9] pb-3">
                  <h3 className="font-bold text-[#0F172A] text-sm">Send to Any Custom WhatsApp Number</h3>
                  <p className="text-xs text-slate-500">Direct instant message to any player, sponsor, or organizer.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-xs">WhatsApp Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={customDmPhone}
                      onChange={(e) => setCustomDmPhone(e.target.value)}
                      placeholder="+88017XXXXXXXX or 017XXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1 text-xs">Recipient Name (Optional)</label>
                    <input
                      type="text"
                      value={customDmName}
                      onChange={(e) => setCustomDmName(e.target.value)}
                      placeholder="e.g. Shakib (Team Alpha)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Quick Templates */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">⚡ 1-Tap Quick Templates:</label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => applyCustomTemplate('ROOM_ID')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold"
                    >
                      🎮 Room ID & Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => applyCustomTemplate('WELCOME')}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold"
                    >
                      👋 Welcome Greeting
                    </button>
                    <button
                      type="button"
                      onClick={() => applyCustomTemplate('PAYMENT')}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold"
                    >
                      💰 Payment Reminder
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-xs">Message Content *</label>
                  <textarea
                    rows={6}
                    value={customDmMessage}
                    onChange={(e) => setCustomDmMessage(e.target.value)}
                    placeholder="Type custom message content..."
                    className="w-full p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendCustomDm}
                  disabled={isSendingCustomDm || !customDmPhone.trim() || !customDmMessage.trim()}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  {isSendingCustomDm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSendingCustomDm ? 'Sending via Zavu...' : 'Send Message Now'}</span>
                </button>
              </div>

              {/* History Preview */}
              <div className="lg:col-span-5 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <h4 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">Recent Custom Dispatches</h4>
                {sendHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">No dispatches sent yet in this session.</div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                    {sendHistory.map((h, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-700">{h.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{h.at}</span>
                        </div>
                        <p className="text-slate-600 line-clamp-2 text-[11px]">{h.msg}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 📷 TAB: WHATSAPP WEB DIRECT QR CODE CONNECT              */}
      {/* ======================================================== */}
      {activeTab === 'QR_CONNECT' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 p-6 rounded-[24px] text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                <QrCode className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-black text-white tracking-tight">
                    WhatsApp Web Direct QR Scanner & Device Linking
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border ${
                    qrStatus === 'CONNECTED'
                      ? 'bg-emerald-900/80 text-emerald-300 border-emerald-500/50'
                      : 'bg-amber-900/80 text-amber-300 border-amber-500/50 animate-pulse'
                  }`}>
                    {qrStatus === 'CONNECTED' ? '● AUTHORIZED & CONNECTED' : '● SCAN QR CODE TO LINK'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl">
                  আপনার মোবাইল WhatsApp দিয়ে নিচের QR কোডটি স্ক্যান করে সাইটের সাথে লিঙ্ক করুন। কোনো থার্ড-পার্টি খরচ ছাড়া ১০০% ফ্রিতে আনলিমিটেড গ্রুপে শিডিউলার মেসেজ পাঠান।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={fetchQrStatus}
                disabled={isQrLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isQrLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {/* Main Grid: QR Box + Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Card: QR Scanner / Connected Box (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm space-y-6">
              {qrStatus === 'CONNECTED' ? (
                <div className="py-8 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-slate-900">
                      WhatsApp Web সফলভাবে কানেক্টেড! 🎉
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      আপনার WhatsApp অ্যাকাউন্টটি বর্তমানে সক্রিয় আছে। ওয়েবসাইট থেকে সমস্ত গ্রুপ ব্রডকাস্ট ও শিডিউল মেসেজ এই অ্যাকাউন্ট থেকেই যাবে।
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-md mx-auto space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">কানেক্টেড মোবাইল নম্বর:</span>
                      <strong className="text-emerald-700 font-mono font-bold text-sm">
                        {qrPhoneNumber || '+880 1846-587311'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">সেশন স্টোরেজ:</span>
                      <span className="text-emerald-600 font-bold font-mono">🍃 MongoDB Atlas (0% Egress)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">গ্রুপ ব্রডকাস্ট স্ট্যাটাস:</span>
                      <span className="text-emerald-600 font-bold">✅ Unlimited Groups Active</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSyncGroups}
                      disabled={isSyncingGroups}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGroups ? 'animate-spin' : ''}`} />
                      <span>{isSyncingGroups ? 'Syncing...' : 'গ্রুপগুলো সিঙ্ক করুন (Sync Groups)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogoutQr}
                      disabled={isQrLoading}
                      className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>লগআউট / নতুন ফোন স্ক্যান করুন</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-center">
                  <div className="space-y-1 text-left">
                    <h4 className="text-base font-black text-slate-900">
                      QR কোড স্ক্যান করে ডিভাইস লিঙ্ক করুন
                    </h4>
                    <p className="text-xs text-slate-500">
                      নিচের কোডটি আপনার মোবাইলের WhatsApp ক্যামেরা দিয়ে স্ক্যান করুন।
                    </p>
                  </div>

                  {/* QR Image Box */}
                  <div className="relative w-72 h-72 mx-auto p-4 rounded-3xl bg-white border-2 border-dashed border-emerald-500/40 shadow-md flex items-center justify-center overflow-hidden">
                    {qrCodeImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrCodeImage}
                        alt="WhatsApp QR Code"
                        className="w-full h-full object-contain rounded-2xl"
                      />
                    ) : (
                      <div className="space-y-3 p-4">
                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                        <p className="text-xs text-slate-500 font-medium">QR কোড জেনারেট হচ্ছে...</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      অটো-রিফ্রেশ: <strong>{qrCountdown}s</strong>
                    </span>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={fetchQrStatus}
                      className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer underline underline-offset-2"
                    >
                      এখনই রিফ্রেশ করুন
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Card: Step-by-Step Instructions (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-[24px] bg-slate-900 text-white space-y-5 shadow-lg border border-slate-800">
                <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>কীভাবে স্ক্যান করবেন? (Instructions)</span>
                </h4>

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      ১
                    </div>
                    <div>
                      <strong className="text-white block font-bold">WhatsApp ওপেন করুন:</strong>
                      আপনার মোবাইলে WhatsApp ওপেন করুন।
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      ২
                    </div>
                    <div>
                      <strong className="text-white block font-bold">Linked Devices-এ যান:</strong>
                      Android-এ উপরে থাকা <strong>(⋮) ৩ ডট মেনু</strong> অথবা iPhone-এ <strong>Settings (⚙️)</strong> এ গিয়ে <strong>Linked Devices</strong> সিলেক্ট করুন।
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      ৩
                    </div>
                    <div>
                      <strong className="text-white block font-bold">Link a Device চাপুন:</strong>
                      <strong>"Link a Device"</strong> বাটনে ক্লিক করে ফোনের ক্যামেরা দিয়ে বামের QR কোডটি স্ক্যান করুন।
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                      ৪
                    </div>
                    <div>
                      <strong className="text-white block font-bold">সফল কানেকশন:</strong>
                      স্ক্যান সম্পন্ন হলেই সাথে সাথে আপনার ওয়েবসাইট লাইভ কানেক্ট হয়ে যাবে!
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[11px] text-emerald-300 space-y-1">
                  <p className="font-bold">🛡️ ডেটাবেস ও সিকিউরিটি নিশ্চয়তা:</p>
                  <p className="text-slate-400">
                    সমস্ত সেশন ও কি-স্টোর সরাসরি <strong>MongoDB Atlas</strong>-এ সেভ থাকবে, ফলে আপনার মূল Supabase ডেটাবেসের উপর <strong>০% প্রেসার বা Egress ব্যান্ডউইথ</strong> খরচ হবে।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ⚡ TAB: WHATSAPP CHANNEL AUTO-FORWARDER / RELAY           */}
      {/* ======================================================== */}
      {activeTab === 'CHANNEL_FORWARDER' && (
        <div className="space-y-6">

          {/* 1. TOP HERO BANNER & MASTER TOGGLE */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/30 p-6 rounded-[24px] text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                <Forward className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-black text-white tracking-tight">
                    হোয়াটসঅ্যাপ চ্যানেল অটো-ফরোয়ার্ডার (Channel to Groups Relay)
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                    forwarderConfig.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${forwarderConfig.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    {forwarderConfig.enabled ? 'অটো-ফরোয়ার্ডিং চালু (ACTIVE)' : 'বন্ধ রয়েছে (DISABLED)'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  আপনার সিলেক্ট করা WhatsApp চ্যানেলে যে কোনো নতুন মেসেজ বা পোস্ট প্রকাশ হলে, তা অটোমেটিক আপনার সব কানেক্টেড WhatsApp গ্রুপে ফরোয়ার্ড হয়ে যাবে।
                </p>
              </div>
            </div>

            {/* Quick Enable/Disable Switch */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const updated = { ...forwarderConfig, enabled: !forwarderConfig.enabled };
                  setForwarderConfig(updated);
                  handleSaveForwarder(updated);
                }}
                disabled={isSavingForwarder}
                className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 ${
                  forwarderConfig.enabled
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {isSavingForwarder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : forwarderConfig.enabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-400" />
                )}
                <span>{forwarderConfig.enabled ? 'অটো-ফরোয়ার্ডার সক্রিয় আছে' : 'অটো-ফরোয়ার্ডার চালু করুন'}</span>
              </button>
            </div>
          </div>

          {/* 2. STATS BAR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">মোট ফরোয়ার্ড বার্তা</div>
              <div className="text-2xl font-black text-slate-900">{forwarderConfig.totalForwardedCount || 0}</div>
              <div className="text-[11px] text-emerald-600 font-medium">সফলভাবে প্রেরিত</div>
            </div>

            <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">পুনরাবৃত্তি ও ফ্রিকোয়েন্সি</div>
              <div className="text-base font-black text-blue-700 truncate">
                {forwarderConfig.forwardFrequencyMode === 'REPEAT_INTERVAL' 
                  ? `🔁 ${forwarderConfig.repeatCount || 1} বার (প্রতি ${forwarderConfig.repeatIntervalMinutes || 15}মি.)` 
                  : '⚡ তাৎক্ষণিক ১ বার'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {forwarderConfig.forwardFrequencyMode === 'REPEAT_INTERVAL' ? `সময়: ${forwarderConfig.activeStartTime || '08:00'} - ${forwarderConfig.activeEndTime || '23:30'}` : 'Instant 1-Shot Forward'}
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">উৎস চ্যানেল</div>
              <div className="text-sm font-black text-emerald-700 truncate">
                {forwarderConfig.sourceChannelName || 'Not Set'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {forwarderConfig.sourceChannelId || 'All Channels (*)'}
              </div>
            </div>

            <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">প্রাপক গ্রুপসমূহ</div>
              <div className="text-sm font-black text-slate-900 truncate">
                {forwarderConfig.targetGroupMode === 'ALL_GROUPS' ? `সব ${groups.length}টি গ্রুপ` : `${forwarderConfig.targetGroupIds?.length || 0}টি নির্বাচিত গ্রুপ`}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {forwarderConfig.lastForwardedAt ? `সর্বশেষ: ${new Date(forwarderConfig.lastForwardedAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' })}` : 'No recent dispatches'}
              </div>
            </div>
          </div>

          {/* 3. MAIN CONFIGURATION GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: CHANNEL & TARGET GROUPS CONFIGURATION (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">

              {/* Card A: Source Channel Setup & Selection */}
              <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">১. উৎস চ্যানেল নির্বাচন (Source Channel Selection)</h4>
                      <p className="text-[11px] text-slate-500">যে WhatsApp চ্যানেল(গুলো) থেকে বার্তাগুলো অটো-ফরওয়ার্ড হবে</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSyncChannels}
                      disabled={isSyncingChannels}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Fetch followed WhatsApp Channels from Green-API/WaAPI"
                    >
                      {isSyncingChannels ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>{isSyncingChannels ? 'সিঙ্ক হচ্ছে...' : '🔄 আমার চ্যানেল সিঙ্ক করুন'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAddChannelForm(!showAddChannelForm)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{showAddChannelForm ? 'বন্ধ করুন' : '+ নতুন চ্যানেল'}</span>
                    </button>
                  </div>
                </div>

                {/* Inline Add Channel Form */}
                {showAddChannelForm && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 animate-fadeIn">
                    <h5 className="text-xs font-bold text-emerald-950">➕ নতুন চ্যানেল লিস্টে যুক্ত করুন:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="চ্যানেলের নাম (e.g. Scrims Updates)"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        className="p-2.5 rounded-xl bg-white border border-emerald-300 text-xs text-slate-900 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="চ্যানেল লিংক বা JID (e.g. 120363xxx@newsletter)"
                        value={newChannelId}
                        onChange={(e) => setNewChannelId(e.target.value)}
                        className="p-2.5 rounded-xl bg-white border border-emerald-300 text-xs font-mono text-slate-900 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newChannelName.trim() || !newChannelId.trim()) {
                          showToast('Please enter both Channel Name and Channel ID/Link.', 'error');
                          return;
                        }
                        const newChan = {
                          id: `chan_${Date.now()}`,
                          name: newChannelName.trim(),
                          channelId: newChannelId.trim(),
                          description: 'Custom added channel',
                        };
                        const updatedChannels = [...(forwarderConfig.savedChannels || []), newChan];
                        const updated = {
                          ...forwarderConfig,
                          savedChannels: updatedChannels,
                          sourceChannelName: newChan.name,
                          sourceChannelId: newChan.channelId,
                        };
                        setForwarderConfig(updated);
                        setNewChannelName('');
                        setNewChannelId('');
                        setShowAddChannelForm(false);
                        handleSaveForwarder(updated);
                        showToast(`Channel "${newChan.name}" added and selected!`, 'success');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      চ্যানেল সেভ ও সিলেক্ট করুন
                    </button>
                  </div>
                )}

                {/* Saved Channels Selector Pills */}
                {forwarderConfig.savedChannels && forwarderConfig.savedChannels.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold text-slate-600">আমার ফলো করা ও সেভ করা চ্যানেলসমূহ:</label>
                      <span className="text-[10px] text-slate-400 font-bold">{forwarderConfig.savedChannels.length} Channels Available</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {forwarderConfig.savedChannels.map((chan) => {
                        const isSelected = forwarderConfig.sourceChannelId === chan.channelId || (chan.channelId && forwarderConfig.sourceChannelId?.includes(chan.channelId));
                        return (
                          <div
                            key={chan.id}
                            onClick={() => {
                              setForwarderConfig({
                                ...forwarderConfig,
                                sourceChannelName: chan.name,
                                sourceChannelId: chan.channelId,
                              });
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 truncate">{chan.name}</span>
                                {isSelected && <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold shrink-0">SELECTED</span>}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{chan.channelId || 'Link Pending'}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`} />
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSavedChannel(chan.id, e)}
                                className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="চ্যানেল মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      সক্রিয় চ্যানেল নাম / লেবেল (Active Channel Title) *
                    </label>
                    <input
                      type="text"
                      value={forwarderConfig.sourceChannelName}
                      onChange={(e) => setForwarderConfig({ ...forwarderConfig, sourceChannelName: e.target.value })}
                      placeholder="e.g. ESPORTS ZONE BD Official Channel"
                      className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      চ্যানেল লিংক বা Channel JID / ID *
                    </label>
                    <input
                      type="text"
                      value={forwarderConfig.sourceChannelId}
                      onChange={(e) => setForwarderConfig({ ...forwarderConfig, sourceChannelId: e.target.value })}
                      placeholder="https://whatsapp.com/channel/0029Va... অথবা 120363xxxxxx@newsletter (সব চ্যানেল হলে * দিন)"
                      className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      💡 আপনি আপনার WhatsApp চ্যানেলের লিঙ্ক (<code>https://whatsapp.com/channel/...</code>), JID (<code>@newsletter</code>) অথবা সব চ্যানেল মনিটর করতে <code>*</code> দিতে পারেন।
                    </p>
                  </div>
                </div>
              </div>

              {/* Card B: Frequency & Repetition Controls (কতবার এবং কতক্ষণ পর পর ফরওয়ার্ড হবে) */}
              <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Repeat className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">২. ফরোয়ার্ড পুনরাবৃত্তি ও বিরতি (Frequency & Repetition)</h4>
                      <p className="text-[11px] text-slate-500">মেসেজটি মোট কতবার এবং কতক্ষণ পর পর গ্রুপগুলোতে পাঠাতে চান নির্ধারণ করুন</p>
                    </div>
                  </div>
                </div>

                {/* Timing Mode: Instant Once vs Auto-Repeat */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForwarderConfig({ ...forwarderConfig, forwardFrequencyMode: 'INSTANT_ONCE', repeatCount: 1 })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      forwarderConfig.forwardFrequencyMode === 'INSTANT_ONCE'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold shadow-xs'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">⚡ শুধু ১ বার (Instant Once)</span>
                      {forwarderConfig.forwardFrequencyMode === 'INSTANT_ONCE' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500">চ্যানেলে পোস্ট হওয়ামাত্র সাথে সাথে একবারই ফরওয়ার্ড হবে</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForwarderConfig({ ...forwarderConfig, forwardFrequencyMode: 'REPEAT_INTERVAL', repeatCount: Math.max(2, forwarderConfig.repeatCount || 3) })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      forwarderConfig.forwardFrequencyMode === 'REPEAT_INTERVAL'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 font-bold shadow-xs'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">🔁 একাধিকবার অটো-রিপিট (Auto-Repeat)</span>
                      {forwarderConfig.forwardFrequencyMode === 'REPEAT_INTERVAL' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500">নির্দিষ্ট সময় পর পর মেসেজটি স্বয়ংক্রিয় রিমাইন্ডার হিসেবে বারবার যাবে</p>
                  </button>
                </div>

                {/* Sub-controls when Auto-Repeat is active */}
                {forwarderConfig.forwardFrequencyMode === 'REPEAT_INTERVAL' && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    {/* Repeat Count (কতবার পাঠাবে) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          🎯 মোট কতবার ফরোয়ার্ড পাঠাবে (Total Repeat Count):
                        </label>
                        <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          {forwarderConfig.repeatCount || 1} বার (Executions)
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        {[2, 3, 5, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setForwarderConfig({ ...forwarderConfig, repeatCount: num })}
                            className={`py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                              forwarderConfig.repeatCount === num
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {num} বার
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const customVal = prompt('মোট কতবার ফরওয়ার্ড করতে চান লিখুন (সংখ্যা):', String(forwarderConfig.repeatCount || 3));
                            if (customVal && Number(customVal) > 0) {
                              setForwarderConfig({ ...forwarderConfig, repeatCount: Number(customVal) });
                            }
                          }}
                          className={`py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                            ![2, 3, 5, 10].includes(forwarderConfig.repeatCount || 0)
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          কাস্টম ({forwarderConfig.repeatCount || 1})
                        </button>
                      </div>
                    </div>

                    {/* Interval Delay (কতক্ষণ পর পর যাবে) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          ⏱️ কতক্ষণ পর পর ফরোয়ার্ড যাবে (Interval Delay):
                        </label>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          প্রতি {forwarderConfig.repeatIntervalMinutes || 15} মিনিট পর পর
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                        {[
                          { label: '৫ মিনিট', mins: 5 },
                          { label: '১০ মিনিট', mins: 10 },
                          { label: '১৫ মিনিট', mins: 15 },
                          { label: '৩০ মিনিট', mins: 30 },
                          { label: '১ ঘণ্টা', mins: 60 },
                          { label: '২ ঘণ্টা', mins: 120 },
                        ].map((item) => (
                          <button
                            key={item.mins}
                            type="button"
                            onClick={() => setForwarderConfig({ ...forwarderConfig, repeatIntervalMinutes: item.mins })}
                            className={`py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                              forwarderConfig.repeatIntervalMinutes === item.mins
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Window Hours */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          শুরুর সময় (Active Start Time)
                        </label>
                        <input
                          type="time"
                          value={forwarderConfig.activeStartTime || '08:00'}
                          onChange={(e) => setForwarderConfig({ ...forwarderConfig, activeStartTime: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          শেষের সময় (Active End Time)
                        </label>
                        <input
                          type="time"
                          value={forwarderConfig.activeEndTime || '23:30'}
                          onChange={(e) => setForwarderConfig({ ...forwarderConfig, activeEndTime: e.target.value })}
                          className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card C: Target Groups Setup */}
              <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">৩. প্রাপক WhatsApp গ্রুপসমূহ (Destination Groups)</h4>
                      <p className="text-[11px] text-slate-500">কোন কোন গ্রুপে চ্যানেলের মেসেজ ফরোয়ার্ড হবে নির্বাচন করুন</p>
                    </div>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForwarderConfig({ ...forwarderConfig, targetGroupMode: 'ALL_GROUPS' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      forwarderConfig.targetGroupMode === 'ALL_GROUPS'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">সব WhatsApp গ্রুপে</span>
                      {forwarderConfig.targetGroupMode === 'ALL_GROUPS' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500">কানেক্টেড থাকা সব {groups.length}টি গ্রুপে একযোগে যাবে</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForwarderConfig({ ...forwarderConfig, targetGroupMode: 'SELECTED_GROUPS' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      forwarderConfig.targetGroupMode === 'SELECTED_GROUPS'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">নির্দিষ্ট গ্রুপে (Custom)</span>
                      {forwarderConfig.targetGroupMode === 'SELECTED_GROUPS' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {forwarderConfig.targetGroupIds?.length || 0}টি গ্রুপ নির্বাচিত
                    </p>
                  </button>
                </div>

                {/* Specific Groups Multi-Select List */}
                {forwarderConfig.targetGroupMode === 'SELECTED_GROUPS' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={forwarderSearchQuery}
                          onChange={(e) => setForwarderSearchQuery(e.target.value)}
                          placeholder="গ্রুপের নাম দিয়ে খুঁজুন..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={toggleForwarderSelectAllGroups}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold shrink-0 transition-all cursor-pointer"
                      >
                        {(forwarderConfig.targetGroupIds || []).length === groups.length ? 'সব বাদ দিন' : 'সব সিলেক্ট করুন'}
                      </button>
                    </div>

                    <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 border border-slate-100 p-2 rounded-xl bg-slate-50/50">
                      {groups
                        .filter(g =>
                          (g.name || '').toLowerCase().includes(forwarderSearchQuery.toLowerCase()) ||
                          (g.identifier || '').toLowerCase().includes(forwarderSearchQuery.toLowerCase())
                        )
                        .map((grp) => {
                          const isSelected = (forwarderConfig.targetGroupIds || []).includes(grp.identifier || grp.id);
                          return (
                            <div
                              key={grp.id}
                              onClick={() => toggleForwarderGroupSelection(grp.identifier || grp.id)}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-white border-emerald-500 shadow-xs'
                                  : 'bg-white/80 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-slate-900 text-xs truncate">{grp.name}</h5>
                                  <p className="text-[10px] text-slate-400 font-mono truncate">{grp.identifier}</p>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                                {grp.memberCount ? `${grp.memberCount} Members` : 'Group'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Card D: Message Styling & Customization */}
              <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">৪. মেসেজ ফরম্যাট ও হেডার/ফুটার কাস্টমাইজেশন</h4>
                    <p className="text-[11px] text-slate-500">ফরোয়ার্ড করা মেসেজের শুরুতে বা শেষে স্বয়ংক্রিয় টেক্সট যুক্ত করুন</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মেসেজের শুরুর হেডার টেক্সট (Optional Prefix Header)
                    </label>
                    <input
                      type="text"
                      value={forwarderConfig.prefixHeader || ''}
                      onChange={(e) => setForwarderConfig({ ...forwarderConfig, prefixHeader: e.target.value })}
                      placeholder="e.g. 📢 *[অফিশিয়াল চ্যানেল নোটিশ]*"
                      className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মেসেজের শেষের ফুটার টেক্সট / চ্যানেল লিংক (Optional Footer)
                    </label>
                    <input
                      type="text"
                      value={forwarderConfig.appendFooter || ''}
                      onChange={(e) => setForwarderConfig({ ...forwarderConfig, appendFooter: e.target.value })}
                      placeholder="e.g. 🔗 আমাদের অফিশিয়াল চ্যানেলে যোগ দিন: https://whatsapp.com/channel/..."
                      className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="forwardIncludeMedia"
                      checked={forwarderConfig.includeMedia !== false}
                      onChange={(e) => setForwarderConfig({ ...forwarderConfig, includeMedia: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <label htmlFor="forwardIncludeMedia" className="text-xs font-bold text-slate-700 cursor-pointer">
                      চ্যানেল পোস্টের সাথে ইমেজ / ব্যানার ফটো থাকলে তাও গ্রুপে ফরোয়ার্ড করুন
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveForwarder()}
                      disabled={isSavingForwarder}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                    >
                      {isSavingForwarder ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{isSavingForwarder ? 'সেভ হচ্ছে...' : 'সেটিংস সেভ করুন (Save Configuration)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: MANUAL TEST RELAY & WEBHOOK INTEGRATION (5 COLS) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Card D: Live Manual Test Relay Box */}
              <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">⚡ টেস্ট ফরোয়ার্ড / রিয়েলটাইম রিলে</h4>
                      <p className="text-[11px] text-slate-500">গ্রুপসমূহে সাথে সাথে টেস্ট বার্তা পাঠিয়ে চেক করুন</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleManualForwardRelay} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      টেস্ট মেসেজ কন্টেন্ট *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={manualRelayMessage}
                      onChange={(e) => setManualRelayMessage(e.target.value)}
                      placeholder="চ্যানেলের যে কোনো পোস্ট বা নোটিশ এখানে পেস্ট করুন..."
                      className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ইমেজ / ব্যানার লিংক (Optional Image URL)
                    </label>
                    <input
                      type="url"
                      value={manualRelayImageUrl}
                      onChange={(e) => setManualRelayImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>টার্গেট গ্রুপ:</span>
                      <strong className="text-slate-900">
                        {forwarderConfig.targetGroupMode === 'ALL_GROUPS'
                          ? `সকল ${groups.length}টি গ্রুপ`
                          : `${forwarderConfig.targetGroupIds?.length || 0}টি নির্বাচিত গ্রুপ`}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>হেডার প্রিফিক্স:</span>
                      <span className="text-emerald-700 font-medium truncate max-w-[160px]">{forwarderConfig.prefixHeader || 'None'}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isRelayingManual || !manualRelayMessage.trim()}
                    className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-40"
                  >
                    {isRelayingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-400" />}
                    <span>{isRelayingManual ? 'গ্রুপে পাঠানো হচ্ছে...' : 'এখনই গ্রুপে টেস্ট ফরোয়ার্ড করুন'}</span>
                  </button>
                </form>
              </div>

              {/* Card E: Webhook Setup Instructions */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-[24px] p-6 space-y-4 text-white shadow-md">
                <div className="flex items-center gap-2.5 border-b border-slate-700 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">স্বয়ংক্রিয় অটো-ফরোয়ার্ডার Webhook</h4>
                    <p className="text-[11px] text-slate-300">চ্যানেলে পোস্ট হওয়ামাত্র স্বয়ংক্রিয় ট্রিগার হবে</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    আপনার Green-API / WaAPI ড্যাশবোর্ডে গিয়ে নিচের Webhook URL টি পেস্ট করে <code>incomingMessageReceived</code> ইভেন্ট চালু করে রাখুন:
                  </p>

                  <div className="p-3 bg-black/50 border border-slate-700 rounded-xl space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">আপনার Webhook URL:</span>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-emerald-400 font-mono text-[11px] break-all">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : 'https://yourdomain.com/api/webhooks/whatsapp'}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/api/webhooks/whatsapp`;
                          navigator.clipboard.writeText(url);
                          showToast('Webhook URL ক্লিপবোর্ডে কপি করা হয়েছে!', 'success');
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all shrink-0 cursor-pointer"
                        title="Copy Webhook URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>সব ধরণের টেক্সট বার্তা স্বয়ংক্রিয় রিলে হবে</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ইমেজ / ব্যানার ফটো সাপোর্ট অন্তর্ভুক্ত</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ডুপ্লিকেট মেসেজ প্রতিরোধ সিস্টেম রয়েছে</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card F: Recent Forwarded Messages History */}
              <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">সাম্প্রতিক ফরোয়ার্ড ইতিহাস</h4>
                  <button
                    onClick={() => loadData(false)}
                    className="text-[11px] text-emerald-600 hover:underline font-bold"
                  >
                    রিফ্রেশ
                  </button>
                </div>

                {logs.filter(l => l.triggerType === 'CHANNEL_FORWARD').length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    এখনও কোনো চ্যানেল বার্তা ফরোয়ার্ড করা হয়নি।
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {logs
                      .filter(l => l.triggerType === 'CHANNEL_FORWARD')
                      .slice(0, 10)
                      .map((log) => (
                        <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-700 truncate max-w-[180px]">{log.targetName || log.targetDestination}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              log.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                          <p className="text-slate-600 line-clamp-2 text-[11px]">{log.messageText}</p>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.sentAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka' })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. TAB 2: AUTOMATED SCHEDULERS (Mobile First Cards + Table) */}
      {/* ======================================================== */}
      {activeTab === 'SCHEDULES' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">Active WhatsApp Scheduled Automations</h2>
                <p className="text-xs text-slate-500">
                  Manage recurring intervals, repetition counts, and multi-message sequences.
                </p>
              </div>

              <button
                onClick={() => setScheduleModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Auto Schedule</span>
              </button>
            </div>

            {loading && schedules.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-xs">Loading schedules...</div>
            ) : schedules.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">No automated schedules configured yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create recurring message broadcasts for room IDs, tournament announcements, or group promotions.
                </p>
              </div>
            ) : (
              <>
                {/* ─────────── MOBILE VIEW: CARDS (< md) ─────────── */}
                <div className="grid grid-cols-1 gap-3.5 md:hidden">
                  {schedules.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[9px] uppercase border border-purple-200">
                            {s.targetType.replace('_', ' ')}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{s.title}</h4>
                          <span className="text-[11px] text-emerald-700 font-medium">{s.targetName || s.targetDestination}</span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.status === 'COMPLETED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : s.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {s.status === 'COMPLETED' ? '✓ COMPLETED' : s.status === 'ACTIVE' ? '● ACTIVE' : '⏸ PAUSED'}
                        </span>
                      </div>

                      {/* Frequency & Progress */}
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Frequency:</span>
                          <strong className="text-slate-800">
                            {s.frequency === 'EVERY_1_MIN' ? '⚡ Every 1 Min' :
                             s.frequency === 'EVERY_2_MIN' ? '⚡ Every 2 Mins' :
                             s.frequency === 'EVERY_5_MIN' ? 'Every 5 Mins' :
                             s.frequency === 'EVERY_10_MIN' ? 'Every 10 Mins' :
                             s.frequency === 'EVERY_15_MIN' ? 'Every 15 Mins' :
                             s.frequency === 'EVERY_30_MIN' ? 'Every 30 Mins' :
                             s.frequency === 'EVERY_1_HOUR' ? 'Every 1 Hour' :
                             s.frequency === 'EVERY_2_HOURS' ? 'Every 2 Hours' :
                             s.frequency === 'EVERY_6_HOURS' ? 'Every 6 Hours' :
                             s.frequency === 'DAILY' ? `Daily at ${s.scheduledTime || '20:45'}` :
                             s.frequency === 'INTERVAL_MINUTES' ? `Every ${s.intervalMinutes || 60}m` : 'One Time'}
                          </strong>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Executions:</span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {s.runCount || 0} {s.maxExecutions ? `/ ${s.maxExecutions} (${Math.max(0, s.maxExecutions - (s.runCount || 0))} left)` : '(Unlimited)'}
                          </span>
                        </div>

                        {s.nextRunAt && s.status === 'ACTIVE' && (
                          <div className="text-[10px] font-mono text-emerald-700 pt-1 border-t border-slate-100 font-bold">
                            Next: {formatNextRun(s.nextRunAt)}
                          </div>
                        )}
                      </div>

                      {/* Touch Action Buttons */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          onClick={() => handleRunNow(s.id)}
                          className="py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1 active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Run Now</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(s.id)}
                          className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center justify-center gap-1 active:scale-95"
                        >
                          {s.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{s.status === 'ACTIVE' ? 'Pause' : 'Resume'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteSchedule(s.id)}
                          className="py-2 px-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 flex items-center justify-center gap-1 active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ─────────── DESKTOP VIEW: TABLE (>= md) ─────────── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Schedule Title & Task</th>
                        <th className="px-4 py-3">Target Audience</th>
                        <th className="px-4 py-3">Timing & Frequency</th>
                        <th className="px-4 py-3">Next Execution</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {schedules.map((s) => (
                        <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900 text-sm">{s.title}</div>
                            {s.description && (
                              <div className="text-[11px] text-slate-500 max-w-sm truncate">{s.description}</div>
                            )}
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {s.id}</div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200 uppercase">
                              {s.targetType.replace('_', ' ')}
                            </span>
                            <div className="font-semibold text-slate-800 mt-1">{s.targetName || s.targetDestination}</div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-900 block">
                              {s.frequency === 'EVERY_1_MIN' ? '⚡ Every 1 Minute' :
                               s.frequency === 'EVERY_2_MIN' ? '⚡ Every 2 Minutes' :
                               s.frequency === 'EVERY_5_MIN' ? 'Every 5 Minutes' :
                               s.frequency === 'EVERY_10_MIN' ? 'Every 10 Minutes' :
                               s.frequency === 'EVERY_15_MIN' ? 'Every 15 Minutes' :
                               s.frequency === 'EVERY_30_MIN' ? 'Every 30 Minutes' :
                               s.frequency === 'EVERY_1_HOUR' ? 'Every 1 Hour' :
                               s.frequency === 'EVERY_2_HOURS' ? 'Every 2 Hours' :
                               s.frequency === 'EVERY_6_HOURS' ? 'Every 6 Hours' :
                               s.frequency === 'DAILY' ? `Daily at ${s.scheduledTime || '20:45'}` :
                               s.frequency === 'INTERVAL_MINUTES' ? `Every ${s.intervalMinutes || 60} mins` : 'One Time'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                              Sent: <strong className="text-slate-800">{s.runCount || 0}</strong> {s.maxExecutions ? `/ ${s.maxExecutions} (${Math.max(0, s.maxExecutions - (s.runCount || 0))} left)` : '(Unlimited)'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            {s.nextRunAt && s.status === 'ACTIVE' ? (
                              <div className="text-[11px] font-mono font-bold text-emerald-700">
                                {formatNextRun(s.nextRunAt)}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">
                                {s.status === 'COMPLETED' ? '✓ Completed' : 'Paused'}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              s.status === 'COMPLETED'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : s.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {s.status === 'COMPLETED' ? '✓ COMPLETED' : s.status === 'ACTIVE' ? '● ACTIVE' : '⏸ PAUSED'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleRunNow(s.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                              Run Now
                            </button>

                            <button
                              onClick={() => handleToggleStatus(s.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 transition-all cursor-pointer"
                            >
                              {s.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5 inline text-amber-600" /> : <Play className="w-3.5 h-3.5 inline text-emerald-600" />}
                            </button>

                            <button
                              onClick={() => handleDeleteSchedule(s.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. TAB 3: BOT AUTO-RESPONDER                             */}
      {/* ======================================================== */}
      {activeTab === 'BOT_AUTO_REPLY' && (
        <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
          <div className="border-b border-[#F1F5F9] pb-4">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">WhatsApp Bot Auto-Responder</h2>
            <p className="text-xs text-slate-500">
              Configure automatic instant replies when players text your WhatsApp number.
            </p>
          </div>

          <form onSubmit={handleSaveBotConfig} className="space-y-5 text-xs font-medium">
            {/* Welcome Greeting */}
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">👋 Welcome Greeting Message</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={botConfig.welcomeMessageEnabled}
                    onChange={(e) => setBotConfig(prev => ({ ...prev, welcomeMessageEnabled: e.target.checked }))}
                    className="accent-emerald-600 w-4 h-4 rounded"
                  />
                  <span className="text-slate-700 text-xs font-bold">Enable Greeting</span>
                </label>
              </div>

              <textarea
                rows={4}
                value={botConfig.welcomeMessage}
                onChange={(e) => setBotConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Keyword Trigger Rules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">⚡ Keyword Triggers & Auto Replies:</span>
                <button
                  type="button"
                  onClick={() => {
                    const newRule = {
                      id: `rule_${Date.now()}`,
                      keywords: ['support', 'help'],
                      replyText: 'আমাদের সাপোর্ট টিমে স্বাগতম! কীভাবে সাহায্য করতে পারি?',
                      isActive: true,
                    };
                    setBotConfig(prev => ({ ...prev, rules: [...prev.rules, newRule] }));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-700 font-bold text-xs border border-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Trigger Rule</span>
                </button>
              </div>

              <div className="space-y-3">
                {botConfig.rules.map((rule, idx) => (
                  <div key={rule.id} className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Keywords (comma separated):
                        </label>
                        <input
                          type="text"
                          value={rule.keywords.join(', ')}
                          onChange={(e) => {
                            const newKws = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                            const updated = [...botConfig.rules];
                            updated[idx].keywords = newKws;
                            setBotConfig(prev => ({ ...prev, rules: updated }));
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = botConfig.rules.filter((_, i) => i !== idx);
                          setBotConfig(prev => ({ ...prev, rules: updated }));
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Auto Reply Text:</label>
                      <textarea
                        rows={3}
                        value={rule.replyText}
                        onChange={(e) => {
                          const updated = [...botConfig.rules];
                          updated[idx].replyText = e.target.value;
                          setBotConfig(prev => ({ ...prev, rules: updated }));
                        }}
                        className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingBot}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {isSavingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSavingBot ? 'Saving...' : 'Save Bot Auto-Responder Config'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. TAB 4: INSTANT GROUP BROADCAST                        */}
      {/* ======================================================== */}
      {activeTab === 'INSTANT_BROADCAST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="border-b border-[#F1F5F9] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Instant WhatsApp Group Broadcast</h2>
              <p className="text-xs text-slate-500">Broadcast emergency announcements or tournament updates right now.</p>
            </div>

            <form onSubmit={handleInstantBroadcast} className="space-y-4 text-xs font-medium">
              {/* Target Mode Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Broadcast Target Mode *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastTargetMode('SELECTED_GROUPS')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      broadcastTargetMode === 'SELECTED_GROUPS'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>🎯 Selected Groups</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[10px]">
                        {selectedGroupIds.length}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Pick multiple specific groups</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastTargetMode('ALL_GROUPS');
                      setSelectedGroupIds(groups.map(g => g.identifier || g.id));
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      broadcastTargetMode === 'ALL_GROUPS'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>📢 All Groups</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[10px]">
                        {groups.length}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Send to all {groups.length} groups at once</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastTargetMode('ALL_REGISTERED')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      broadcastTargetMode === 'ALL_REGISTERED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>👥 Captains DM</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[10px]">
                        {contacts.length}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Direct message to registered squad captains</div>
                  </button>
                </div>
              </div>

              {/* Multi-Group Checkbox Grid */}
              {broadcastTargetMode === 'SELECTED_GROUPS' && (
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">
                      Select WhatsApp Groups ({selectedGroupIds.length} of {groups.length} selected):
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAllGroups}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      {selectedGroupIds.length === groups.length ? 'Deselect All' : `Select All (${groups.length})`}
                    </button>
                  </div>

                  {groups.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No groups synced yet. Go to Connected Groups tab to sync.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {groups.map((g) => {
                        const isChecked = selectedGroupIds.includes(g.identifier) || selectedGroupIds.includes(g.id);
                        return (
                          <label
                            key={g.id}
                            className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-all text-xs ${
                              isChecked
                                ? 'bg-white border-emerald-500 shadow-2xs text-slate-900 ring-1 ring-emerald-500/30'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleGroupSelection(g.identifier || g.id)}
                              className="mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs truncate">{g.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">{g.identifier}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <ImageUploadInput
                  label="Attach Picture / Banner (ছবি / ব্যানার আপলোড বা লিঙ্ক - Optional)"
                  value={broadcastImageUrl}
                  onChange={(val) => setBroadcastImageUrl(val)}
                  placeholder="https://example.com/tournament_poster.jpg or upload from device"
                  theme="light"
                  maxWidth={1200}
                  maxHeight={800}
                  helperText="ডিভাইস থেকে ব্যানার/পোস্টার আপলোড করুন অথবা সরাসরি ইমেজ লিঙ্ক দিন"
                  presets={[
                    { label: 'Sample Gaming Banner', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60' }
                  ]}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Broadcast Message Content (Caption) *</label>
                <textarea
                  rows={7}
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type broadcast message..."
                  className="w-full p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-slate-900 focus:outline-none focus:border-emerald-600 leading-relaxed font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isBroadcasting}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {isBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isBroadcasting ? 'Broadcasting...' : 'Dispatch Broadcast Immediately'}</span>
              </button>
            </form>
          </div>

          {/* Live Mobile Preview */}
          <div className="lg:col-span-5 bg-[#ECE5DD] border border-[#D5CCC1] rounded-[24px] p-5 flex flex-col justify-between shadow-inner">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#D5CCC1]/70 pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">Live WhatsApp Preview</span>
              </div>

              <div className="bg-white rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {broadcastImageUrl && (
                  <div className="rounded-xl overflow-hidden mb-2.5 max-h-48 border border-slate-200 bg-slate-100">
                    <img src={broadcastImageUrl} alt="Broadcast Banner" className="w-full h-40 object-cover" />
                  </div>
                )}
                {broadcastMessage}
                <div className="text-[10px] text-slate-400 text-right mt-2 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 text-center mt-4 font-mono">
              🔒 End-to-end encrypted message delivery
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. TAB 5: GROUPS & AUDIENCES                             */}
      {/* ======================================================== */}
      {activeTab === 'GROUPS' && (
        <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">Connected WhatsApp Groups & Channels</h2>
              <p className="text-xs text-slate-500">
                Target your tournament groups, VIP scrims communities, and phone numbers in schedules.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleSyncGroups}
                disabled={isSyncingGroups}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingGroups ? 'animate-spin' : ''}`} />
                <span>{isSyncingGroups ? 'Syncing...' : 'Sync Groups from WhatsApp'}</span>
              </button>

              <button
                onClick={() => setGroupModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer self-start sm:self-auto active:scale-95 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add New Group</span>
              </button>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#F8FAFC] border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">No WhatsApp Groups Connected Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Click <strong>&quot;Sync Groups from WhatsApp&quot;</strong> to automatically import your active WhatsApp groups from your linked device, or click <strong>&quot;Add New Group&quot;</strong> to add one manually with an invite link.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={handleSyncGroups}
                  disabled={isSyncingGroups}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGroups ? 'animate-spin' : ''}`} />
                  <span>Sync WhatsApp Groups</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {groups.map((grp) => (
                <div
                  key={grp.id}
                  className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/60 text-emerald-800 border border-emerald-200 uppercase">
                        {grp.category.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => handleDeleteGroup(grp.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-2">{grp.name}</h3>
                    {grp.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{grp.description}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      Target: <strong className="text-slate-800">{grp.identifier}</strong>
                    </div>
                    {grp.memberCount ? (
                      <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>~{grp.memberCount} Members</span>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastTargetMode('SELECTED_GROUPS');
                        setSelectedGroupIds([grp.identifier || grp.id]);
                        setBroadcastMessage(`🎮 [${grp.name}] টুর্নামেন্ট আপডেট:\n\nরুম আইডি ও জরুরি নোটিশ প্রকাশ করা হয়েছে! সবাই দ্রুত প্রস্তুত থাকুন: https://brkesports.com`);
                        setActiveTab('INSTANT_BROADCAST');
                        showToast(`Selected "${grp.name}". Compose message to send now.`, 'success');
                      }}
                      className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all mt-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message to Group</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. TAB 6: DISPATCH HISTORY & LOGS                       */}
      {/* ======================================================== */}
      {activeTab === 'LOGS' && (
        <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">WhatsApp Dispatch Logs</h2>
              <p className="text-xs text-slate-500">Live records of all automated schedules and player DMs.</p>
            </div>
            <div className="flex items-center gap-2">
              {logs.length > 0 && (
                <button
                  onClick={async () => {
                    if (confirm('আপনি কি নিশ্চিত যে সমস্ত WhatsApp লগ মুছে ফেলতে চান?')) {
                      try {
                        const res = await fetch('/api/admin/whatsapp/scheduler?clearLogs=true', {
                          method: 'DELETE',
                          credentials: 'include',
                        });
                        if (res.ok) {
                          setLogs([]);
                          showToast('সমস্ত লগ সফলভাবে মুছে ফেলা হয়েছে!', 'success');
                        }
                      } catch {
                        showToast('লগ মুছতে সমস্যা হয়েছে।', 'error');
                      }
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Logs</span>
                </button>
              )}
              <button
                onClick={() => loadData(false)}
                className="p-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Refresh Logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">No message logs recorded yet.</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {logs.map((log) => (
                <div key={log.id} className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  log.status === 'SENT' ? 'bg-[#F8FAFC] border-slate-200' : 'bg-red-50/50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 truncate">{log.targetName || log.targetDestination}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                      log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px] line-clamp-2">{log.messageText}</p>
                  {log.status === 'FAILED' && log.error && (
                    <p className="text-red-600 text-[10px] font-medium bg-red-100 rounded-lg px-2 py-1 mt-1">
                      ⚠️ {log.error}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span>{log.triggerType}</span>
                    <span>{new Date(log.sentAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 11. TAB 7: API CONFIG & TEST                             */}
      {/* ======================================================== */}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-6 max-w-3xl">
          {/* Main Gateway Settings Card */}
          <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
            <div className="border-b border-[#F1F5F9] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">WhatsApp Gateway & Provider Settings</h2>
              <p className="text-xs text-slate-500">Configure your WaAPI instance token or Zavu credentials.</p>
            </div>

            <form onSubmit={handleSaveGatewaySettings} className="space-y-5 text-xs font-medium">
              {/* Active Provider Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Active WhatsApp Gateway Provider *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between gap-2 transition-all ${
                    gatewaySettings.provider === 'DIRECT_QR'
                      ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="provider"
                        value="DIRECT_QR"
                        checked={gatewaySettings.provider === 'DIRECT_QR'}
                        onChange={() => setGatewaySettings(prev => ({ ...prev, provider: 'DIRECT_QR' }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="font-bold text-xs text-emerald-900">📱 WhatsApp Web QR (Default)</div>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">Direct Device Link • 0% Egress • Multi-Group</div>
                  </label>

                  <label className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between gap-2 transition-all ${
                    gatewaySettings.provider === 'GREEN_API'
                      ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="provider"
                        value="GREEN_API"
                        checked={gatewaySettings.provider === 'GREEN_API'}
                        onChange={() => setGatewaySettings(prev => ({ ...prev, provider: 'GREEN_API' }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="font-bold text-xs text-emerald-900">🟢 Green-API</div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">Console Gateway</div>
                  </label>

                  <label className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between gap-2 transition-all ${
                    gatewaySettings.provider === 'WAAPI'
                      ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="provider"
                        value="WAAPI"
                        checked={gatewaySettings.provider === 'WAAPI'}
                        onChange={() => setGatewaySettings(prev => ({ ...prev, provider: 'WAAPI' }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="font-bold text-xs">WaAPI Instance</div>
                    </div>
                    <div className="text-[11px] text-slate-500">QR Instance (waapi.app)</div>
                  </label>

                  <label className={`p-3.5 rounded-2xl border cursor-pointer flex flex-col justify-between gap-2 transition-all ${
                    gatewaySettings.provider === 'ZAVU'
                      ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="provider"
                        value="ZAVU"
                        checked={gatewaySettings.provider === 'ZAVU'}
                        onChange={() => setGatewaySettings(prev => ({ ...prev, provider: 'ZAVU' }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="font-bold text-xs">Zavu (Cloud API)</div>
                    </div>
                    <div className="text-[11px] text-slate-500">Meta Cloud Direct</div>
                  </label>
                </div>
              </div>

              {/* 📱 Direct QR Configuration Box */}
              {gatewaySettings.provider === 'DIRECT_QR' && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      Direct WhatsApp Web QR Mode Active
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('QR_CONNECT')}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Open QR Scanner Tab →
                    </button>
                  </div>
                  <p className="text-xs text-slate-600">
                    এই মোডে আপনার নিজের ফোন দিয়ে স্ক্যান করা WhatsApp Web অ্যাকাউন্ট দিয়ে সমস্ত গ্রুপ মেসেজ ও শিডিউলার পাঠানো হবে।
                  </p>
                </div>
              )}

              {/* 🟢 Green-API Configuration Box */}
              {gatewaySettings.provider === 'GREEN_API' && (
                <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Green-API Developer Instance (100% Free)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900">
                      Instance #{gatewaySettings.greenApiInstanceId || '710722716896'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-800 font-bold mb-1">apiTokenInstance (API Token) *</label>
                    <input
                      type="text"
                      required
                      value={gatewaySettings.greenApiToken}
                      onChange={(e) => setGatewaySettings(prev => ({ ...prev, greenApiToken: e.target.value }))}
                      placeholder="Paste your apiTokenInstance from Green-API console"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-800 font-bold mb-1">idInstance *</label>
                      <input
                        type="text"
                        required
                        value={gatewaySettings.greenApiInstanceId}
                        onChange={(e) => setGatewaySettings(prev => ({ ...prev, greenApiInstanceId: e.target.value }))}
                        placeholder="710722716896"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-800 font-bold mb-1">apiUrl *</label>
                      <input
                        type="text"
                        value={gatewaySettings.greenApiUrl}
                        onChange={(e) => setGatewaySettings(prev => ({ ...prev, greenApiUrl: e.target.value }))}
                        placeholder="https://7107.api.greenapi.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* WaAPI Configuration Box */}
              {gatewaySettings.provider === 'WAAPI' && (
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      WaAPI Instance Credentials
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      Instance #{gatewaySettings.waapiInstanceId || '102791'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">WaAPI API Token (Bearer Token) *</label>
                    <input
                      type="text"
                      value={gatewaySettings.waapiApiKey}
                      onChange={(e) => setGatewaySettings(prev => ({ ...prev, waapiApiKey: e.target.value }))}
                      placeholder="Paste WaAPI API Token (e.g. cMm1iOuY0d6xwpO...)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Instance ID *</label>
                      <input
                        type="text"
                        value={gatewaySettings.waapiInstanceId}
                        onChange={(e) => setGatewaySettings(prev => ({ ...prev, waapiInstanceId: e.target.value }))}
                        placeholder="102791"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Webhook URL</label>
                      <input
                        type="text"
                        readOnly
                        value="https://brk-esports.vercel.app/api/webhooks/whatsapp"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Zavu Configuration Box */}
              {gatewaySettings.provider === 'ZAVU' && (
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-900 text-xs block">Zavu Cloud API Key</span>
                  <input
                    type="text"
                    value={gatewaySettings.zavuApiKey}
                    onChange={(e) => setGatewaySettings(prev => ({ ...prev, zavuApiKey: e.target.value }))}
                    placeholder="zv_live_..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
              >
                {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isSavingSettings ? 'Saving Settings...' : 'Save WhatsApp Settings'}</span>
              </button>
            </form>
          </div>

          {/* Test Message Tool */}
          <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 text-xs">
            <div className="border-b border-[#F1F5F9] pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Send Live Test Message</h3>
              <p className="text-[11px] text-slate-500">Verify end-to-end messaging using your active gateway.</p>
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+88017XXXXXXXX"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              <button
                type="button"
                disabled={isSendingTest || !testPhone.trim()}
                onClick={async () => {
                  setIsSendingTest(true);
                  try {
                    const res = await fetch('/api/admin/whatsapp/test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ phone: testPhone.trim() }),
                    });
                    const d = await res.json();
                    if (res.ok && d.success) {
                      showToast(d.message || 'Test message sent successfully!', 'success');
                    } else {
                      showToast(d.message || 'Test failed.', 'error');
                    }
                  } catch {
                    showToast('Network error.', 'error');
                  } finally {
                    setIsSendingTest(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
              >
                {isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 👥 MODAL: CREATE AUTOMATED SCHEDULE                      */}
      {/* ======================================================== */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Create WhatsApp Auto-Schedule</h3>
                  <p className="text-[11px] text-slate-500">Configure frequency, intervals, and message count limits</p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateSchedule} className="p-4 sm:p-6 space-y-4 text-xs font-medium overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Schedule Name / Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Daily 9:00 PM Room ID Auto-Alert"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              {/* Target Audience */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Target Recipient Type *</label>
                    <select
                      value={formTargetType}
                      onChange={(e) => {
                        const val = e.target.value as WhatsAppTargetType;
                        setFormTargetType(val);
                        if (val === 'TOURNAMENT_CAPTAINS') {
                          setFormTargetDestination('ACTIVE_TOURNAMENTS');
                          setFormTargetName('All Active Squad Captains');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="GROUP">💬 WhatsApp Group(s)</option>
                      <option value="TOURNAMENT_CAPTAINS">👥 Verified Squad Captains</option>
                      <option value="CUSTOM_PHONE">📱 Custom Phone Number</option>
                    </select>
                  </div>

                  {formTargetType !== 'GROUP' && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Target Phone / Identifier *</label>
                      <input
                        type="text"
                        required
                        value={formTargetDestination}
                        onChange={(e) => setFormTargetDestination(e.target.value)}
                        placeholder={formTargetType === 'TOURNAMENT_CAPTAINS' ? 'ACTIVE_TOURNAMENTS' : '+88017XXXXXXXX'}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Multi-Group Selection for Schedules */}
                {formTargetType === 'GROUP' && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-800 font-bold text-xs">Target WhatsApp Groups *</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormTargetGroupMode('ALL_GROUPS');
                            setFormSelectedGroupIds(groups.map(g => g.identifier || g.id));
                          }}
                          className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            formTargetGroupMode === 'ALL_GROUPS'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          📢 All Groups ({groups.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormTargetGroupMode('SELECTED_GROUPS')}
                          className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                            formTargetGroupMode === 'SELECTED_GROUPS'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          🎯 Pick Groups ({formSelectedGroupIds.length})
                        </button>
                      </div>
                    </div>

                    {formTargetGroupMode === 'SELECTED_GROUPS' && (
                      <div className="space-y-2 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                          <span className="text-slate-500">Select which groups will receive this schedule:</span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleSyncGroups}
                              disabled={isSyncingGroups}
                              className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Sync all WhatsApp groups from your linked phone"
                            >
                              <RefreshCw className={`w-3 h-3 ${isSyncingGroups ? 'animate-spin' : ''}`} />
                              <span>{isSyncingGroups ? 'Syncing...' : 'Sync Groups'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (formSelectedGroupIds.length === groups.length) {
                                  setFormSelectedGroupIds([]);
                                } else {
                                  setFormSelectedGroupIds(groups.map(g => g.identifier || g.id));
                                }
                              }}
                              className="font-bold text-slate-700 hover:underline cursor-pointer"
                            >
                              {formSelectedGroupIds.length === groups.length ? 'Deselect All' : `Select All (${groups.length})`}
                            </button>
                          </div>
                        </div>

                        {/* Search Groups input */}
                        {groups.length > 4 && (
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={scheduleGroupSearch}
                              onChange={(e) => setScheduleGroupSearch(e.target.value)}
                              placeholder="Search groups by name or ID (e.g. Scrim, Deadjone)..."
                              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        )}

                        {groups.length === 0 ? (
                          <div className="p-4 text-center rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1.5">
                            <p className="font-bold">No groups synced yet.</p>
                            <button
                              type="button"
                              onClick={handleSyncGroups}
                              disabled={isSyncingGroups}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                            >
                              <RefreshCw className={`w-3 h-3 ${isSyncingGroups ? 'animate-spin' : ''}`} />
                              <span>Sync WhatsApp Groups Now</span>
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {groups
                              .filter(g => !scheduleGroupSearch || g.name.toLowerCase().includes(scheduleGroupSearch.toLowerCase()) || (g.identifier && g.identifier.toLowerCase().includes(scheduleGroupSearch.toLowerCase())))
                              .map((g) => {
                                const isChecked = formSelectedGroupIds.includes(g.identifier) || formSelectedGroupIds.includes(g.id);
                                return (
                                  <label
                                    key={g.id}
                                    className={`p-2 rounded-xl border cursor-pointer flex items-start gap-2 transition-all text-xs ${
                                      isChecked
                                        ? 'bg-white border-emerald-500 shadow-2xs text-slate-900 ring-1 ring-emerald-500/30'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleFormGroupSelection(g.identifier || g.id)}
                                      className="mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-xs truncate">{g.name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono truncate">{g.identifier}</div>
                                    </div>
                                  </label>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Timing, Frequency & Execution Limits */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Timing, Frequency & Limit (কতক্ষণ পর পর এবং কয়বার পাঠাবে):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Frequency (কতক্ষণ পর পর?) *</label>
                    <select
                      value={formFrequency}
                      onChange={(e) => setFormFrequency(e.target.value as WhatsAppFrequency)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="EVERY_1_MIN">⚡ Every 1 Minute (প্রতি ১ মিনিট)</option>
                      <option value="EVERY_2_MIN">⚡ Every 2 Minutes (প্রতি ২ মিনিট)</option>
                      <option value="EVERY_5_MIN">Every 5 Minutes (প্রতি ৫ মিনিট)</option>
                      <option value="EVERY_10_MIN">Every 10 Minutes (প্রতি ১০ মিনিট)</option>
                      <option value="EVERY_15_MIN">Every 15 Minutes (প্রতি ১৫ মিনিট)</option>
                      <option value="EVERY_30_MIN">Every 30 Minutes (প্রতি ৩০ মিনিট)</option>
                      <option value="EVERY_1_HOUR">Every 1 Hour (প্রতি ১ ঘণ্টা)</option>
                      <option value="EVERY_2_HOURS">Every 2 Hours (প্রতি ২ ঘণ্টা)</option>
                      <option value="EVERY_6_HOURS">Every 6 Hours (প্রতি ৬ ঘণ্টা)</option>
                      <option value="DAILY">Daily at Specific Time (প্রতিদিন নির্দিষ্ট সময়)</option>
                      <option value="INTERVAL_MINUTES">Custom Minutes (কাস্টম মিনিট)</option>
                      <option value="ONCE">One-Time (নির্দিষ্ট তারিখে ১ বার)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Message Count Limit (কয়টা মেসেজ দিবে?) *</label>
                    <select
                      value={['0', '1', '3', '5', '10', '20', '50'].includes(formMaxExecutions) ? formMaxExecutions : 'CUSTOM'}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setFormMaxExecutions('10');
                        } else {
                          setFormMaxExecutions(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="0">∞ Unlimited (বিরতিহীন চলবে)</option>
                      <option value="1">1 Time Only (১ বার পাঠাবে)</option>
                      <option value="3">3 Times (৩ বার পাঠাবে)</option>
                      <option value="5">5 Times (৫ বার পাঠাবে)</option>
                      <option value="10">10 Times (১০ বার পাঠাবে)</option>
                      <option value="20">20 Times (২০ বার পাঠাবে)</option>
                      <option value="50">50 Times (৫০ বার পাঠাবে)</option>
                      <option value="CUSTOM">Custom Count (কাস্টম সংখ্যা)</option>
                    </select>
                  </div>

                  {!['0', '1', '3', '5', '10', '20', '50'].includes(formMaxExecutions) && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Exact Send Count *</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={formMaxExecutions}
                        onChange={(e) => setFormMaxExecutions(e.target.value)}
                        placeholder="e.g. 7"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {formFrequency === 'DAILY' && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Daily Run Time *</label>
                      <input
                        type="time"
                        value={formScheduledTime}
                        onChange={(e) => setFormScheduledTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {formFrequency === 'INTERVAL_MINUTES' && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Repeat Every (Minutes) *</label>
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        value={formIntervalMinutes}
                        onChange={(e) => setFormIntervalMinutes(e.target.value)}
                        placeholder="e.g. 45"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Message Content & Sequences */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-bold">WhatsApp Message Template Content *</label>
                  <button
                    type="button"
                    onClick={() => setFormUseSequence(!formUseSequence)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      formUseSequence ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>🔄 {formUseSequence ? 'Rotation Mode Active' : 'Enable Rotating Messages'}</span>
                  </button>
                </div>

                {formUseSequence ? (
                  <div className="space-y-3 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <p className="text-[11px] text-indigo-700 font-medium">
                      প্রতিটি ইন্টারভালে নিচের মেসেজগুলো একের পর এক চক্রাকারে পাঠানো হবে:
                    </p>
                    {formMessagesSequence.map((msg, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-indigo-900 font-bold">
                          <span>Message #{idx + 1}</span>
                          {formMessagesSequence.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setFormMessagesSequence(formMessagesSequence.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={3}
                          value={msg}
                          onChange={(e) => {
                            const copy = [...formMessagesSequence];
                            copy[idx] = e.target.value;
                            setFormMessagesSequence(copy);
                          }}
                          placeholder={`Message ${idx + 1} text...`}
                          className="w-full p-2.5 rounded-xl bg-white border border-indigo-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormMessagesSequence([...formMessagesSequence, ''])}
                      className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-bold text-[11px] hover:bg-indigo-50 cursor-pointer"
                    >
                      + Add Next Sequence Message
                    </button>
                  </div>
                ) : (
                  <textarea
                    rows={6}
                    required={!formUseSequence}
                    value={formMessageTemplate}
                    onChange={(e) => setFormMessageTemplate(e.target.value)}
                    placeholder="Enter template text with placeholders (e.g. {COUNT}, {MAX_COUNT}, {TIME}, {SITE_LINK})..."
                    className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                )}
                {/* Optional Schedule Image / Banner */}
                <div className="space-y-1.5">
                  <ImageUploadInput
                    label="Attach Picture / Banner (ছবি / ব্যানার আপলোড বা লিঙ্ক - Optional)"
                    value={formImageUrl}
                    onChange={(val) => setFormImageUrl(val)}
                    placeholder="https://example.com/banner.jpg or upload from device"
                    theme="light"
                    maxWidth={1200}
                    maxHeight={800}
                    helperText="সরাসরি মোবাইল/পিসি থেকে ছবি আপলোড করতে পারবেন অথবা ছবির URL দিতে পারবেন।"
                  />
                  {formImageUrl && formImageUrl.startsWith('data:') && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-medium">
                      <span className="shrink-0 mt-0.5">⚠️</span>
                      <span>
                        এই ছবির URL (base64) WhatsApp গ্রুপে পাঠানো যাবে না — Green-API publicly accessible URL দরকার।
                        পরিবর্তে <strong>Image URL</strong> ট্যাবে একটি public https:// link দিন (যেমন: Imgur, ImgBB, বা আপনার website-এর ছবির লিঙ্ক)।
                        <br />Schedule image ছাড়াই text message সঠিকভাবে পাঠানো হবে।
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Modal Action Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save & Activate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 👥 MODAL: ADD NEW WHATSAPP GROUP                         */}
      {/* ======================================================== */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Add New WhatsApp Group</h3>
                  <p className="text-[11px] text-slate-500">Connect a group invite link or phone identifier</p>
                </div>
              </div>
              <button
                onClick={() => setGroupModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-4 sm:p-6 space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Group Title / Name *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Free Fire Daily Scrims Squad #1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Group Category</label>
                  <select
                    value={groupCategory}
                    onChange={(e) => setGroupCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="TOURNAMENT_MAIN">Tournament Main</option>
                    <option value="SCRIMS_VIP">VIP Scrims</option>
                    <option value="REGISTRATION_GROUP">Registration Group</option>
                    <option value="GENERAL">General Community</option>
                    <option value="CUSTOM">Custom Group</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Estimated Members</label>
                  <input
                    type="number"
                    value={groupMemberCount}
                    onChange={(e) => setGroupMemberCount(e.target.value)}
                    placeholder="250"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ⚠️ WhatsApp Group JID (Required for messaging)
                </label>
                <input
                  type="text"
                  required
                  value={groupIdentifier}
                  onChange={(e) => setGroupIdentifier(e.target.value)}
                  placeholder="120363028392819283@g.us (Group JID format)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                {groupIdentifier && (groupIdentifier.includes('chat.whatsapp.com/') || groupIdentifier.includes('whatsapp.com/channel/')) ? (
                  <p className="mt-1.5 text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    ❌ Invite link দিয়ে message পাঠানো যায় না! Groups tab → "🔄 Sync Groups" করুন — তাহলে automatically @g.us JID পাবেন।
                  </p>
                ) : groupIdentifier && groupIdentifier.includes('@g.us') ? (
                  <p className="mt-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    ✅ Valid Group JID — এই format এ message পাঠানো যাবে।
                  </p>
                ) : groupIdentifier ? (
                  <p className="mt-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ℹ️ Phone number format — Individual DM এর জন্য ঠিক আছে। Group broadcast এর জন্য @g.us JID দরকার।
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Group JID পেতে: Settings → Groups → "🔄 Sync Groups" বাটন চাপুন।
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Purpose of this group..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
