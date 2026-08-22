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
  Info
} from 'lucide-react';
import { WhatsAppSchedule, WhatsAppTargetGroup, WhatsAppMessageLog, WhatsAppFrequency, WhatsAppTargetType } from '@/lib/types';

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
  const [activeTab, setActiveTab] = useState<'DIRECT_INBOX' | 'SCHEDULES' | 'BOT_AUTO_REPLY' | 'INSTANT_BROADCAST' | 'GROUPS' | 'LOGS' | 'SETTINGS'>('DIRECT_INBOX');
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
    provider: 'GREEN_API' | 'WAAPI' | 'ZAVU';
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
    provider: 'GREEN_API',
    greenApiUrl: 'https://7107.api.greenapi.com',
    greenApiInstanceId: '710722716896',
    greenApiToken: '',
    waapiApiKey: '',
    waapiInstanceId: '102791',
    zavuApiKey: '',
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
    welcomeMessage: `🎮 স্বাগতম Black Rock Esports-এ! 🎮\n\nআমরা প্রতিদিন নিয়মিত Free Fire টুর্নামেন্ট ও কাস্টম ম্যাচ আয়োজন করি।\n\n🔹 টুর্নামেন্টে যোগ দিতে ভিজিট করুন: https://brkesports.com/tournaments\n🔹 রুম ও আইডি সহায়তার জন্য 'room' লিখে পাঠান।\n🔹 ডিপোজিট ও পেমেন্ট সহায়তার জন্য 'bkash' লিখে পাঠান।`,
    defaultFallbackReply: `ধন্যবাদ মেসেজ দেওয়ার জন্য! আমাদের অ্যাডমিন টিম দ্রুত আপনার সাথে যোগাযোগ করবে।\nটুর্নামেন্ট ডিটেইলস জানতে ভিজিট করুন: https://brkesports.com`,
    rules: [
      {
        id: 'rule_room',
        keywords: ['room', 'id', 'pass', 'password', 'রুম', 'পাসওয়ার্ড'],
        replyText: `🎮 Room ID & Pass নোটিশ:\n\nআপনার টুর্নামেন্ট শুরু হওয়ার ঠিক ১৫ মিনিট আগে আপনার WhatsApp নম্বরে এবং আমাদের ওয়েবসাইটে Room ID ও Password রিলিজ করা হবে!\n\nসঠিক স্লটে জয়েন করতে brkesports.com-এ নজর রাখুন।`,
        isActive: true,
      },
      {
        id: 'rule_bkash',
        keywords: ['bkash', 'nagad', 'payment', 'টাকা', 'পেমেন্ট', 'বিকাশ', 'নগদ'],
        replyText: `💰 পেমেন্ট ও ওয়ালেট ডিপোজিট:\n\nঅটোমেটিক ব্যালেন্স অ্যাড করতে আমাদের সাইটের Wallet অপশনে যান।\nবিকাশ/নগদ সেন্ড মানি করে TrxID সাবমিট করলেই ৫ মিনিটে ব্যালেন্স অ্যাড হয়ে যাবে!\nলিঙ্ক: https://brkesports.com/wallet`,
        isActive: true,
      },
    ],
  });
  const [isSavingBot, setIsSavingBot] = useState(false);

  // 1. Create Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetType, setFormTargetType] = useState<WhatsAppTargetType>('GROUP');
  const [formTargetDestination, setFormTargetDestination] = useState('');
  const [formTargetName, setFormTargetName] = useState('');
  const [formFrequency, setFormFrequency] = useState<WhatsAppFrequency>('EVERY_1_HOUR');
  const [formIntervalMinutes, setFormIntervalMinutes] = useState('60');
  const [formMaxExecutions, setFormMaxExecutions] = useState('0'); // 0 = unlimited
  const [formScheduledTime, setFormScheduledTime] = useState('20:45');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formActiveStartTime, setFormActiveStartTime] = useState('09:00');
  const [formActiveEndTime, setFormActiveEndTime] = useState('23:00');
  const [formMessageTemplate, setFormMessageTemplate] = useState('');
  const [formUseSequence, setFormUseSequence] = useState(false);
  const [formMessagesSequence, setFormMessagesSequence] = useState<string[]>([
    '🔥 টুর্নামেন্ট স্লট বুকিং চলছে! দ্রুত রেজিস্টার করুন: https://brkesports.com/tournaments',
    '⚡ আর মাত্র কয়েকটি স্লট বাকি! আপনার স্কোয়াড নিশ্চিত করুন: https://brkesports.com/tournaments',
    '🚨 শেষ সুযোগ! কিছুক্ষণের মধ্যে রেজিস্ট্রেশন বন্ধ হয়ে যাবে। Booyah জিতুন: https://brkesports.com'
  ]);

  // 2. Add Group Modal State
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCategory, setGroupCategory] = useState<'TOURNAMENT_MAIN' | 'SCRIMS_VIP' | 'REGISTRATION_GROUP' | 'GENERAL' | 'CUSTOM'>('TOURNAMENT_MAIN');
  const [groupIdentifier, setGroupIdentifier] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMemberCount, setGroupMemberCount] = useState('100');

  // 3. Instant Broadcast State
  const [broadcastTarget, setBroadcastTarget] = useState('ALL_REGISTERED');
  const [broadcastMessage, setBroadcastMessage] = useState(`🎮 BRK ESPORTS TOURNAMENT NOTIFICATION 🎮\n\nআজকের টুর্নামেন্টের রুম আইডি ও জরুরি আপডেট প্রকাশ করা হয়েছে!\n\nসবাই দ্রুত অ্যাপে লগইন করে রুম চেক করুন: https://brkesports.com`);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // 4. API Settings State
  const [testPhone, setTestPhone] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async (options?: { silent?: boolean } | any) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    try {
      try {
        await fetch('/api/admin/whatsapp/cron', { method: 'POST', credentials: 'include' });
      } catch {}

      const [schedRes, botRes, statusRes, contactsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/whatsapp/scheduler', { credentials: 'include' }),
        fetch('/api/admin/whatsapp/bot', { credentials: 'include' }),
        fetch('/api/admin/whatsapp/status', { credentials: 'include' }),
        fetch('/api/admin/whatsapp/contacts', { credentials: 'include' }),
        fetch('/api/admin/whatsapp/settings', { credentials: 'include' }),
      ]);

      if (schedRes.ok) {
        const data = await schedRes.json();
        setSchedules(data.schedules || []);
        setGroups(data.groups || []);
        setLogs(data.logs || []);
        if (data.stats) setStats(data.stats);

        if (data.groups && data.groups.length > 0 && !formTargetDestination) {
          setFormTargetDestination(data.groups[0].identifier || data.groups[0].id);
          setFormTargetName(data.groups[0].name);
        }
      }

      if (botRes.ok) {
        const botData = await botRes.json();
        if (botData.config) setBotConfig(botData.config);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setZavuStatus(statusData);
      }

      if (settingsRes.ok) {
        const setJson = await settingsRes.json();
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

      if (contactsRes.ok) {
        const contactData = await contactsRes.json();
        setContacts(contactData.contacts || []);
        if (contactData.contacts && contactData.contacts.length > 0 && !selectedContact) {
          selectContactHandler(contactData.contacts[0]);
        }
      }
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Failed to load data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      loadData({ silent: true });
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const selectContactHandler = (c: WhatsAppContact) => {
    setSelectedContact(c);
    setDirectPhone(c.phone || c.formattedPhone);
    setDirectName(c.name || c.squadName || 'Player');
    setCustomRoomId(c.roomId || 'BRK-ROOM-01');
    setCustomRoomPass(c.roomPassword || '1234');
    
    setDirectMessage(
      `🎮 আসসালামু আলাইকুম ${c.name} (${c.squadName || 'Squad Captain'})!\n\nআপনার "${c.tournamentTitle || 'Black Rock Tournament'}" টুর্নামেন্টের জরুরি নোটিশ:\n🔹 Room ID: ${c.roomId || '98765432'}\n🔹 Password: ${c.roomPassword || '1234'}\n\nসঠিক স্লটে দ্রুত জয়েন করুন! 🔥\nলিঙ্ক: https://brkesports.com`
    );
  };

  const applyDirectTemplate = (templateType: 'ROOM_ID' | 'VERIFIED' | 'PAYMENT' | 'ANTI_CHEAT') => {
    const name = directName || 'Player';
    const squad = selectedContact?.squadName || 'Squad';
    const tour = selectedContact?.tournamentTitle || 'Black Rock Tournament';
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
    if (gatewaySettings.provider === 'GREEN_API' && !gatewaySettings.greenApiToken) {
      showToast('Please paste your Green-API apiTokenInstance in "⚙️ API Config" tab first.', 'error');
      setActiveTab('SETTINGS');
      return;
    }
    if (gatewaySettings.provider === 'WAAPI' && !gatewaySettings.waapiApiKey) {
      showToast('Please paste your WaAPI API Token in "⚙️ API Config" tab first.', 'error');
      setActiveTab('SETTINGS');
      return;
    }
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
          apiKey: gatewaySettings.provider === 'GREEN_API' ? gatewaySettings.greenApiToken : gatewaySettings.waapiApiKey,
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
            targetDestination: formTargetDestination,
            targetName: formTargetName || 'Target Audience',
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
    try {
      const res = await fetch(`/api/admin/whatsapp/scheduler?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Schedule deleted.', 'success');
        await loadData();
      }
    } catch {
      showToast('Failed to delete schedule.', 'error');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Remove this WhatsApp group?')) return;
    try {
      const res = await fetch(`/api/admin/whatsapp/scheduler?groupId=${groupId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Group removed.', 'success');
        await loadData();
      }
    } catch {
      showToast('Failed to remove group.', 'error');
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

    setIsBroadcasting(true);
    try {
      if (broadcastTarget === 'ALL_REGISTERED') {
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
        // Direct broadcast to the specific WhatsApp Group or JID!
        const targetGroup = groups.find(g => g.identifier === broadcastTarget || g.id === broadcastTarget);
        const groupDisplayName = targetGroup?.name || 'WhatsApp Group';

        const res = await fetch('/api/admin/whatsapp/direct-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: broadcastTarget,
            recipientName: groupDisplayName,
            message: broadcastMessage.trim(),
            templateType: 'GROUP_BROADCAST',
          }),
          credentials: 'include',
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`✅ Broadcast delivered to "${groupDisplayName}"!`, 'success');
          setBroadcastMessage('');
          await loadData();
        } else {
          showToast(data.message || 'Failed to dispatch broadcast to group.', 'error');
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
                {zavuStatus?.activeSender?.name || 'Black Rock Esports WhatsApp'}
              </h2>
              {loading || zavuStatus === null ? (
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
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-sm border border-slate-800 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-400 tracking-wider text-[11px] truncate">
            REALTIME AUTOMATION ACTIVE
          </span>
          <span className="text-slate-400 text-[11px] hidden md:inline font-mono">
            • Auto-evaluating scheduled intervals every 10s • Zavu API Gateway
          </span>
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

            {loading ? (
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
                            {s.frequency === 'EVERY_5_MIN' ? 'Every 5 Mins' :
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
                          <div className="text-[10px] font-mono text-emerald-700 pt-1 border-t border-slate-100">
                            Next: {new Date(s.nextRunAt).toLocaleTimeString()} ({new Date(s.nextRunAt).toLocaleDateString()})
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
                              {s.frequency === 'EVERY_5_MIN' ? 'Every 5 Minutes' :
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
                              <div className="text-[11px] font-mono font-semibold text-emerald-700">
                                {new Date(s.nextRunAt).toLocaleDateString()} {new Date(s.nextRunAt).toLocaleTimeString()}
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
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Select Target Audience / Group *</label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="ALL_REGISTERED">👥 All Verified Squad Captains ({contacts.length} players)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.identifier}>
                      💬 {g.name} ({g.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Broadcast Message Content *</label>
                <textarea
                  rows={8}
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

              <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
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
                        setBroadcastTarget(grp.identifier);
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
            <button
              onClick={() => loadData(false)}
              className="p-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">No message logs recorded yet.</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {logs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 truncate">{log.targetName || log.targetDestination}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                      log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px]">{log.messageText}</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      <div className="font-bold text-xs text-emerald-900">🟢 Green-API (Free)</div>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">100% Free Developer Tier for Groups & Schedulers</div>
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
                    <div className="text-[11px] text-slate-500">QR Device Linked instance (waapi.app)</div>
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
                    <div className="text-[11px] text-slate-500">Meta WhatsApp Official Cloud direct messaging</div>
                  </label>
                </div>
              </div>

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
                    <option value="GROUP">💬 WhatsApp Group</option>
                    <option value="TOURNAMENT_CAPTAINS">👥 Verified Squad Captains</option>
                    <option value="CUSTOM_PHONE">📱 Custom Phone Number</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Group / Phone *</label>
                  {formTargetType === 'GROUP' ? (
                    <select
                      value={formTargetDestination}
                      onChange={(e) => {
                        setFormTargetDestination(e.target.value);
                        const sel = groups.find(g => g.identifier === e.target.value || g.id === e.target.value);
                        if (sel) setFormTargetName(sel.name);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.identifier}>
                          {g.name} ({g.category})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={formTargetDestination}
                      onChange={(e) => setFormTargetDestination(e.target.value)}
                      placeholder={formTargetType === 'TOURNAMENT_CAPTAINS' ? 'ACTIVE_TOURNAMENTS' : '+88017XXXXXXXX'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                    />
                  )}
                </div>
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
                <label className="block text-slate-700 font-bold mb-1">WhatsApp Group Invite Link / JID / Phone *</label>
                <input
                  type="text"
                  required
                  value={groupIdentifier}
                  onChange={(e) => setGroupIdentifier(e.target.value)}
                  placeholder="https://chat.whatsapp.com/xxxxxxxxx or phone"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
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
