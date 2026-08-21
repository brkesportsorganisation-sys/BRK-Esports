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
  Copy
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

  // Live Zavu Status
  const [zavuStatus, setZavuStatus] = useState<{
    connected: boolean;
    account?: { projectName: string; teamName: string };
    balance?: { balanceUsd: string; currency: string };
    senders?: Array<{ id: string; name: string; phoneNumber: string; isDefault: boolean }>;
    activeSender?: { id: string; name: string; phoneNumber: string };
  } | null>(null);

  // Direct Inbox State
  const [searchContactQuery, setSearchContactQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [directPhone, setDirectPhone] = useState('');
  const [directName, setDirectName] = useState('');
  const [directMessage, setDirectMessage] = useState('');
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [customRoomId, setCustomRoomId] = useState('');
  const [customRoomPass, setCustomRoomPass] = useState('');

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
  const [formScheduledTime, setFormScheduledTime] = useState('20:45');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formActiveStartTime, setFormActiveStartTime] = useState('09:00');
  const [formActiveEndTime, setFormActiveEndTime] = useState('23:00');
  const [formMessageTemplate, setFormMessageTemplate] = useState('');

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedRes, botRes, statusRes, contactsRes] = await Promise.all([
        fetch('/api/admin/whatsapp/scheduler', { credentials: 'include' }),
        fetch('/api/admin/whatsapp/bot', { credentials: 'include' }),
        fetch('/api/admin/whatsapp/status', { credentials: 'include' }),
        fetch('/api/admin/whatsapp/contacts', { credentials: 'include' }),
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

      if (contactsRes.ok) {
        const contactData = await contactsRes.json();
        setContacts(contactData.contacts || []);
        if (contactData.contacts && contactData.contacts.length > 0 && !selectedContact) {
          selectContactHandler(contactData.contacts[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectContactHandler = (c: WhatsAppContact) => {
    setSelectedContact(c);
    setDirectPhone(c.phone || c.formattedPhone);
    setDirectName(c.name || c.squadName || 'Player');
    setCustomRoomId(c.roomId || 'BRK-ROOM-01');
    setCustomRoomPass(c.roomPassword || '1234');
    
    // Default message template for this player
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

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessageTemplate.trim()) {
      showToast('Title and message template are required.', 'error');
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
            scheduledTime: formScheduledTime,
            scheduledDate: formScheduledDate,
            activeStartTime: formActiveStartTime,
            activeEndTime: formActiveEndTime,
            messageTemplate: formMessageTemplate,
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

    if (!confirm('Send this broadcast message to all selected WhatsApp targets immediately?')) return;

    setIsBroadcasting(true);
    try {
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
      if (res.ok) {
        showToast(data.message || 'Broadcast dispatched successfully!', 'success');
        await loadData();
      } else {
        showToast(data.message || 'Failed to dispatch broadcast.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Network error.', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Filtered contacts
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
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

      {/* 1. Live Bot Account Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 p-6 rounded-[24px] text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Bot className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black text-white tracking-tight">
                {zavuStatus?.activeSender?.name || 'Black Rock Esports Bot'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE & CONNECTED
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300 font-mono mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <strong>{zavuStatus?.activeSender?.phoneNumber || '+880 1866-408811'}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-400">
                Sender ID: <code className="text-emerald-400">{zavuStatus?.activeSender?.id ? zavuStatus.activeSender.id.slice(0, 14) + '...' : 'Live Connected'}</code>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all cursor-pointer"
            title="Sync live status with Zavu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleRunDueAutomations}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Force check and execute any due scheduled jobs"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
            <span>Run Schedulers</span>
          </button>

          <button
            onClick={() => setScheduleModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Auto Schedule</span>
          </button>
        </div>
      </div>

      {/* 2. Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-[#E2E8F0]/80 rounded-[20px] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Captains & Players</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{contacts.length}</div>
          <p className="text-[11px] text-slate-500 font-medium">WhatsApp verified contacts</p>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0]/80 rounded-[20px] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Automations</span>
            <Radio className="w-4 h-4 text-blue-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.activeSchedules}</div>
          <p className="text-[11px] text-slate-500 font-medium">Running on automated intervals</p>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0]/80 rounded-[20px] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Connected Groups</span>
            <MessageCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">{stats.totalGroups}</div>
          <p className="text-[11px] text-slate-500 font-medium">Tournament & Community groups</p>
        </div>

        <div className="p-5 bg-white border border-[#E2E8F0]/80 rounded-[20px] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Dispatched Messages</span>
            <Send className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalExecutions}</div>
          <p className="text-[11px] text-slate-500 font-medium">Delivered via Zavu WhatsApp API</p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('DIRECT_INBOX')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'DIRECT_INBOX'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>📱 Direct Player Inbox & DM ({contacts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'SCHEDULES'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>🤖 Automated Schedulers ({schedules.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BOT_AUTO_REPLY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'BOT_AUTO_REPLY'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>💬 Bot Auto-Responder</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INSTANT_BROADCAST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'INSTANT_BROADCAST'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>📢 Group Broadcast</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GROUPS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'GROUPS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 Groups & Audiences ({groups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOGS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'LOGS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>📜 Dispatch History ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'SETTINGS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>⚙️ API Config & Test</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 4. TAB: DIRECT PLAYER INBOX & DM (PRIMARY TAB) */}
      {/* ======================================================== */}
      {activeTab === 'DIRECT_INBOX' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Contacts List */}
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-5 space-y-4 shadow-xs flex flex-col h-[650px]">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Registered Captains & Players</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select a player to send direct Room ID or custom message
                </p>
              </div>
              <button
                onClick={loadData}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600"
                title="Refresh contacts"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchContactQuery}
                onChange={(e) => setSearchContactQuery(e.target.value)}
                placeholder="Search by player, squad, or phone number..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {/* Contacts Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">No registered contacts found matching your search.</p>
                </div>
              ) : (
                filteredContacts.map((c) => {
                  const isSelected = selectedContact?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => selectContactHandler(c)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                          : 'bg-[#F8FAFC] border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {c.name}
                          </span>
                          <span className={`px-2 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                            c.role === 'CAPTAIN' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {c.role === 'CAPTAIN' ? 'Captain' : 'User'}
                          </span>
                        </div>

                        {c.squadName && (
                          <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                            <Gamepad2 className="w-3 h-3 text-slate-400" />
                            <span>Squad: <strong>{c.squadName}</strong></span>
                          </div>
                        )}

                        <div className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          <span>{c.formattedPhone || c.phone}</span>
                        </div>

                        {c.tournamentTitle && (
                          <div className="text-[9px] text-slate-400 truncate">
                            🏆 {c.tournamentTitle}
                          </div>
                        )}
                      </div>

                      <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Interactive WhatsApp Message Composer */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 shadow-xs flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Direct WhatsApp Message Composer</h3>
                    <p className="text-[11px] text-slate-500">
                      Sending directly from <strong>+880 1866-408811</strong> to player's WhatsApp
                    </p>
                  </div>
                </div>

                {selectedContact && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Recipient: {selectedContact.squadName || selectedContact.name}
                  </span>
                )}
              </div>

              {/* Recipient Details & Quick Template Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    placeholder="+88017XXXXXXXX"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Player / Squad Name</label>
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="Player or Squad Name"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">⚡ 1-Click Message Templates:</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDirectTemplate('ROOM_ID')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Gamepad2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>🎮 Send Room ID & Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyDirectTemplate('VERIFIED')}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>✅ Slot Verified Notice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyDirectTemplate('PAYMENT')}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <span>💰 Payment Reminder</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyDirectTemplate('ANTI_CHEAT')}
                    className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold border border-purple-200 flex items-center gap-1 cursor-pointer"
                  >
                    <span>🛡️ Anti-Cheat Warning</span>
                  </button>
                </div>
              </div>

              {/* Message Content Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700">WhatsApp Message Content *</label>
                  <span className="text-[10px] text-slate-400">Direct WhatsApp formatting supported</span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={directMessage}
                  onChange={(e) => setDirectMessage(e.target.value)}
                  placeholder="Type message text to deliver directly to player's WhatsApp..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-sans text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white leading-relaxed font-medium"
                />
              </div>
            </div>

            {/* Submit Dispatcher Button */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                🚀 Delivered via official Zavu API
              </span>

              <button
                type="button"
                onClick={handleSendDirectMessage}
                disabled={isSendingDirect || !directPhone.trim() || !directMessage.trim()}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingDirect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isSendingDirect ? 'Delivering via Zavu API...' : 'Send WhatsApp Message Now'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 5. TAB 2: AUTOMATED SCHEDULERS */}
      {activeTab === 'SCHEDULES' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-bold text-[#0F172A]">Active WhatsApp Scheduled Automations</h2>
                <p className="text-xs text-[#64748B]">
                  Manage intervals, target groups, recurring times, and live dispatch statuses.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setScheduleModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Schedule</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-16 text-center text-slate-400">Loading automated WhatsApp schedules...</div>
            ) : schedules.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-base">No automated schedules configured</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click "New Schedule" to set up recurring room alerts, tournament registration reminders, or group broadcasts.
                </p>
                <button
                  onClick={() => setScheduleModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create First Schedule</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Schedule Title & Task</th>
                      <th className="px-5 py-3.5">Target Audience</th>
                      <th className="px-5 py-3.5">Timing & Frequency</th>
                      <th className="px-5 py-3.5">Next Execution</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {schedules.map((s) => (
                      <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 text-xs">{s.title}</div>
                          {s.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 max-w-sm line-clamp-1">{s.description}</div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono mt-1">ID: {s.id}</div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200 uppercase">
                            {s.targetType.replace('_', ' ')}
                          </span>
                          <div className="font-semibold text-slate-800 mt-1">{s.targetName || s.targetDestination}</div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 block">
                            {s.frequency === 'EVERY_15_MIN' ? 'Every 15 Minutes' :
                             s.frequency === 'EVERY_30_MIN' ? 'Every 30 Minutes' :
                             s.frequency === 'EVERY_1_HOUR' ? 'Every 1 Hour' :
                             s.frequency === 'EVERY_2_HOURS' ? 'Every 2 Hours' :
                             s.frequency === 'EVERY_6_HOURS' ? 'Every 6 Hours' :
                             s.frequency === 'DAILY' ? `Daily at ${s.scheduledTime || '20:45'}` :
                             s.frequency === 'INTERVAL_MINUTES' ? `Every ${s.intervalMinutes || 60} mins` : 'One Time'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Runs: {s.runCount || 0} times
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {s.nextRunAt ? (
                            <div className="text-[11px] font-mono font-semibold text-emerald-700">
                              {new Date(s.nextRunAt).toLocaleDateString()} {new Date(s.nextRunAt).toLocaleTimeString()}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Paused / Not scheduled</span>
                          )}
                          {s.lastRunAt && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Last: {new Date(s.lastRunAt).toLocaleTimeString()}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {s.status === 'ACTIVE' ? '● ACTIVE' : '⏸ PAUSED'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleRunNow(s.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all cursor-pointer"
                            title="Trigger execution right now"
                          >
                            <Zap className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                            Run Now
                          </button>

                          <button
                            onClick={() => handleToggleStatus(s.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            {s.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5 inline text-amber-600" /> : <Play className="w-3.5 h-3.5 inline text-emerald-600" />}
                          </button>

                          <button
                            onClick={() => handleDeleteSchedule(s.id)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold transition-all cursor-pointer"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB: BOT AUTO-RESPONDER & RULES */}
      {activeTab === 'BOT_AUTO_REPLY' && (
        <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-[#0F172A]">WhatsApp Bot Auto-Responder</h2>
                <p className="text-xs text-[#64748B]">
                  খেলোয়াড়রা আপনার নম্বরে (`+880 1866-408811`) মেসেজ দিলে স্বয়ংক্রিয়ভাবে উত্তর দেওয়ার রুলস ও ওয়েলকাম মেসেজ কনফিগার করুন।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBotConfig(prev => ({ ...prev, autoReplyEnabled: !prev.autoReplyEnabled }))}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                botConfig.autoReplyEnabled
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {botConfig.autoReplyEnabled ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Bot Active</span>
                </>
              ) : (
                <span>Bot Sleeping (OFF)</span>
              )}
            </button>
          </div>

          <form onSubmit={handleSaveBotConfig} className="space-y-6 text-xs font-medium">
            {/* Welcome Greeting */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-700 font-bold">
                  👋 Welcome Greeting Message (নতুন প্লেয়ার মেসেজ দিলে প্রথমবার যা যাবে):
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={botConfig.welcomeMessageEnabled}
                    onChange={(e) => setBotConfig(prev => ({ ...prev, welcomeMessageEnabled: e.target.checked }))}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] font-bold text-slate-600">Enable Welcome Message</span>
                </label>
              </div>

              <textarea
                rows={5}
                value={botConfig.welcomeMessage}
                onChange={(e) => setBotConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                placeholder="Enter welcome greeting text..."
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white leading-relaxed font-sans"
              />
            </div>

            {/* Keyword Rules */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Keyword Triggers & Auto Replies (নির্দিষ্ট শব্দ লিখে মেসেজ দিলে যা যাবে):</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newRule = {
                      id: `rule_${Date.now()}`,
                      keywords: ['support', 'help'],
                      replyText: 'যেকোনো প্রয়োজনে আমাদের সাপোর্ট টিমকে কল বা মেসেজ করুন: +8801866408811',
                      isActive: true,
                    };
                    setBotConfig(prev => ({ ...prev, rules: [...prev.rules, newRule] }));
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Add Trigger Rule</span>
                </button>
              </div>

              <div className="space-y-3">
                {botConfig.rules.map((rule, idx) => (
                  <div key={rule.id} className="p-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Keywords (কমা দিয়ে একাধিক শব্দ দিন যেমন: <code>room, id, pass, পাসওয়ার্ড</code>):
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
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = botConfig.rules.filter((_, i) => i !== idx);
                          setBotConfig(prev => ({ ...prev, rules: updated }));
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Remove Rule"
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
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingBot}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isSavingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isSavingBot ? 'Saving...' : 'Save Bot Auto-Responder Config'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 7. TAB 3: INSTANT GROUP BROADCAST */}
      {activeTab === 'INSTANT_BROADCAST' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-5 shadow-xs">
            <div className="flex items-center space-x-2 border-b border-[#F1F5F9] pb-4">
              <Send className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-[17px] font-bold text-[#0F172A]">Instant WhatsApp Group Broadcast</h2>
                <p className="text-xs text-[#64748B]">
                  Send live announcements, emergency updates, or room credentials directly to your WhatsApp audiences.
                </p>
              </div>
            </div>

            <form onSubmit={handleInstantBroadcast} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Select Target Audience / Group *</label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">Broadcast Message Content *</label>
                  <span className="text-[10px] text-slate-400">Dynamic variables supported</span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type your broadcast message..."
                  className="w-full p-3.5 rounded-[12px] bg-[#F8FAFC] border border-[#E2E8F0] font-sans text-xs text-slate-900 focus:outline-none focus:border-emerald-600 leading-relaxed font-medium"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <span className="font-bold block mb-0.5">ℹ️ Instant Delivery Note:</span>
                <span>Messages will be dispatched in real-time through the Zavu WhatsApp API from <strong>+880 1866-408811</strong>.</span>
              </div>

              <button
                type="submit"
                disabled={isBroadcasting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isBroadcasting ? 'Broadcasting via Zavu WhatsApp API...' : 'Dispatch Broadcast Immediately'}</span>
              </button>
            </form>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-5 bg-[#ECE5DD] border border-[#D5CCC1] rounded-[24px] p-5 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#D5CCC1]/70">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">WhatsApp Broadcast Message Preview</span>
              </div>

              <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {broadcastMessage}
                <div className="text-[10px] text-slate-400 text-right mt-2 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 text-center mt-4 font-medium">
              📱 End-to-end encrypted message delivery
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 4: GROUPS & AUDIENCES */}
      {activeTab === 'GROUPS' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
              <div>
                <h2 className="text-[17px] font-bold text-[#0F172A]">Connected WhatsApp Groups & Channels</h2>
                <p className="text-xs text-[#64748B]">
                  Add your tournament groups, VIP scrims communities, and phone numbers to target in automated schedules.
                </p>
              </div>

              <button
                onClick={() => setGroupModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add New Group</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((grp) => (
                <div key={grp.id} className="p-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] space-y-3 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/60 text-emerald-800 border border-emerald-200 uppercase">
                        {grp.category.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => handleDeleteGroup(grp.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Delete Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-2">{grp.name}</h3>
                    {grp.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{grp.description}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 space-y-1">
                    <div className="text-[10px] text-slate-400 font-mono break-all truncate">
                      Target: <strong>{grp.identifier}</strong>
                    </div>
                    {grp.memberCount ? (
                      <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>~{grp.memberCount} Members</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB 5: DISPATCH HISTORY & LOGS */}
      {activeTab === 'LOGS' && (
        <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#F1F5F9] flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-[#0F172A]">WhatsApp Automation & Dispatch Logs</h2>
              <p className="text-xs text-[#64748B]">Recent messages dispatched by automated schedulers, bot auto-replies, and direct player messages.</p>
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-16 text-center text-slate-400">No message logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Sent Timestamp</th>
                    <th className="px-5 py-3.5">Trigger Type</th>
                    <th className="px-5 py-3.5">Recipient Target</th>
                    <th className="px-5 py-3.5">Message Snippet</th>
                    <th className="px-5 py-3.5 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {log.triggerType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {log.targetName || log.targetDestination}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs truncate text-slate-600 font-mono text-[11px]">
                        {log.messageText}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {log.status === 'SENT' ? '✓ DELIVERED' : '✕ FAILED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 10. TAB 6: API CONFIG & TEST */}
      {activeTab === 'SETTINGS' && (
        <div className="bg-white border border-[#E2E8F0]/80 rounded-[24px] p-6 space-y-6 shadow-xs">
          <div className="border-b border-[#F1F5F9] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-[#0F172A]">Zavu WhatsApp API Connection</h2>
              <p className="text-xs text-[#64748B]">
                Your WhatsApp Bot Account is connected and sending from <strong>+880 1866-408811</strong>.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              🟢 Connected
            </span>
          </div>

          {/* Test Dispatcher */}
          <div className="pt-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Send Live Test Message to WhatsApp</h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Enter recipient number (+88017XXXXXXXX or 017XXXXXXXX)"
                className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!testPhone.trim()) {
                    showToast('Enter a phone number to test.', 'error');
                    return;
                  }
                  setIsSendingTest(true);
                  try {
                    const res = await fetch('/api/admin/whatsapp/test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ testPhone: testPhone.trim() }),
                    });
                    const d = await res.json();
                    if (res.ok) {
                      showToast(d.message || 'Test message sent successfully!', 'success');
                    } else {
                      showToast(d.message || 'Failed to send test message.', 'error');
                    }
                  } catch {
                    showToast('Network error.', 'error');
                  } finally {
                    setIsSendingTest(false);
                  }
                }}
                disabled={isSendingTest}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isSendingTest ? 'Sending...' : 'Send Test WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🚀 MODAL: CREATE NEW AUTOMATED WHATSAPP SCHEDULE */}
      {/* ======================================================== */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-900 text-base">Create Automated WhatsApp Schedule</h3>
                  <p className="text-[11px] text-slate-500">
                    নির্দিষ্ট গ্রুপে কখন, কতক্ষণ পর পর কোন মেসেজ যাবে তা সেট করুন।
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-5 text-xs font-medium max-h-[75vh] overflow-y-auto">
              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Schedule Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Daily 9:00 PM Tournament Room ID Auto-Alert"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Target Recipient Type *
                  </label>
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="GROUP">💬 Specific WhatsApp Group</option>
                    <option value="TOURNAMENT_CAPTAINS">👥 All Registered Squad Captains</option>
                    <option value="CUSTOM_PHONE">📱 Custom Phone Number</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Target Group / Phone Identifier *
                  </label>
                  {formTargetType === 'GROUP' ? (
                    <select
                      value={formTargetDestination}
                      onChange={(e) => {
                        setFormTargetDestination(e.target.value);
                        const sel = groups.find(g => g.identifier === e.target.value);
                        if (sel) setFormTargetName(sel.name);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  )}
                </div>
              </div>

              {/* Timing & Frequency */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Timing & Repeat Frequency (কতক্ষণ পর পর / কখন পাঠাতে হবে):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Frequency *</label>
                    <select
                      value={formFrequency}
                      onChange={(e) => setFormFrequency(e.target.value as WhatsAppFrequency)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="EVERY_15_MIN">Every 15 Minutes (প্রতি ১৫ মিনিট পর পর)</option>
                      <option value="EVERY_30_MIN">Every 30 Minutes (প্রতি ৩০ মিনিট পর পর)</option>
                      <option value="EVERY_1_HOUR">Every 1 Hour (প্রতি ১ ঘণ্টা পর পর)</option>
                      <option value="EVERY_2_HOURS">Every 2 Hours (প্রতি ২ ঘণ্টা পর পর)</option>
                      <option value="EVERY_6_HOURS">Every 6 Hours (প্রতি ৬ ঘণ্টা পর পর)</option>
                      <option value="DAILY">Daily at Specific Time (প্রতিদিন নির্দিষ্ট সময়ে)</option>
                      <option value="INTERVAL_MINUTES">Custom Minutes Interval</option>
                      <option value="ONCE">One-Time Specific Date & Time</option>
                    </select>
                  </div>

                  {formFrequency === 'DAILY' && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Daily Run Time *</label>
                      <input
                        type="time"
                        value={formScheduledTime}
                        onChange={(e) => setFormScheduledTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {formFrequency === 'INTERVAL_MINUTES' && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Repeat Every (Minutes) *</label>
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        value={formIntervalMinutes}
                        onChange={(e) => setFormIntervalMinutes(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}

                  {formFrequency === 'ONCE' && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={formScheduledDate}
                        onChange={(e) => setFormScheduledDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Message Template */}
              <div className="space-y-2">
                <label className="block text-slate-700 font-bold">
                  WhatsApp Message Template Content *
                </label>
                <textarea
                  rows={6}
                  required
                  value={formMessageTemplate}
                  onChange={(e) => setFormMessageTemplate(e.target.value)}
                  placeholder="Enter message template text with emojis and placeholders..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white leading-relaxed font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isProcessing ? 'Saving...' : 'Save & Activate Automation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 👥 MODAL: ADD NEW WHATSAPP GROUP */}
      {/* ======================================================== */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-900 text-base">Add New WhatsApp Group</h3>
                  <p className="text-[11px] text-slate-500">Connect a WhatsApp group or channel link</p>
                </div>
              </div>
              <button
                onClick={() => setGroupModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Group Title / Name *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Free Fire Daily Scrims Squad #1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Group Category</label>
                  <select
                    value={groupCategory}
                    onChange={(e) => setGroupCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="TOURNAMENT_MAIN">Tournament Main Group</option>
                    <option value="SCRIMS_VIP">VIP Scrims Group</option>
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  WhatsApp Group Invite Link / Phone Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={groupIdentifier}
                  onChange={(e) => setGroupIdentifier(e.target.value)}
                  placeholder="https://chat.whatsapp.com/xxxxxxxxx or phone number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Purpose of this group..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
