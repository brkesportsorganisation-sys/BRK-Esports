'use client';

import React, { useState, useEffect } from 'react';
import { 
  Store, 
  UserPlus, 
  KeyRound, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  Lock, 
  Loader2, 
  ShieldAlert, 
  CheckSquare, 
  Square,
  Search,
  RefreshCw,
  Copy,
  ShieldCheck,
  Trophy,
  Users,
  Sparkles,
  ExternalLink,
  Phone,
  Mail,
  AlertCircle,
  Coins,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Building2,
  DollarSign
} from 'lucide-react';
import { 
  VendorAccount, 
  VendorAccessLevel, 
  VendorPermissionKey, 
  VENDOR_PERMISSIONS_LIST, 
  LIMITED_TIER_DEFAULT_PERMISSIONS, 
  FULL_TIER_DEFAULT_PERMISSIONS, 
  Tournament,
  VendorPayoutRequest
} from '@/lib/types';

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorAccount[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<VendorPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'VENDORS' | 'PAYOUTS'>('VENDORS');
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<'ALL' | 'FULL_ACCESS' | 'LIMITED_ACCESS'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modal State for Vendor Creation / Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorAccount | null>(null);
  
  // Reset Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetVendor, setPasswordTargetVendor] = useState<VendorAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [accessLevel, setAccessLevel] = useState<VendorAccessLevel>('LIMITED_ACCESS');
  const [commissionRate, setCommissionRate] = useState<number>(80);
  const [selectedPermissions, setSelectedPermissions] = useState<VendorPermissionKey[]>([
    ...LIMITED_TIER_DEFAULT_PERMISSIONS,
  ]);
  const [assignedTournaments, setAssignedTournaments] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load vendors
      const resVendors = await fetch('/api/admin/vendors', { credentials: 'include' });
      if (resVendors.ok) {
        const data = await resVendors.json();
        setVendors(data.vendors || []);
      }

      // Load tournaments for assignment
      const resTournaments = await fetch('/api/admin/tournaments', { credentials: 'include' });
      if (resTournaments.ok) {
        const data = await resTournaments.json();
        setTournaments(data.tournaments || []);
      }

      // Load payouts
      const resPayouts = await fetch('/api/vendor/payouts', { credentials: 'include' });
      if (resPayouts.ok) {
        const data = await resPayouts.json();
        setPayoutRequests(data.payouts || []);
      }
    } catch (err) {
      console.warn('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const generateRandomVendorId = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setVendorId(`VND-${randomNum}`);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleTierSelect = (tier: VendorAccessLevel) => {
    setAccessLevel(tier);
    if (tier === 'FULL_ACCESS') {
      setSelectedPermissions([...FULL_TIER_DEFAULT_PERMISSIONS]);
      setAssignedTournaments(['ALL']);
    } else {
      setSelectedPermissions([...LIMITED_TIER_DEFAULT_PERMISSIONS]);
      if (assignedTournaments.includes('ALL')) {
        setAssignedTournaments(tournaments.length > 0 ? [tournaments[0].id] : []);
      }
    }
  };

  const openCreateModal = () => {
    setEditingVendor(null);
    setName('');
    setOrgName('');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setVendorId(`VND-${randomNum}`);
    setEmail(`vendor${randomNum}@blackrock.gg`);
    setPassword('vendor123');
    setPhone('');
    setWhatsApp('');
    setAccessLevel('LIMITED_ACCESS');
    setCommissionRate(80);
    setSelectedPermissions([...LIMITED_TIER_DEFAULT_PERMISSIONS]);
    setAssignedTournaments(tournaments.length > 0 ? [tournaments[0].id] : []);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (vendor: VendorAccount) => {
    setEditingVendor(vendor);
    setName(vendor.name);
    setOrgName(vendor.orgName || vendor.name);
    setVendorId(vendor.vendorId);
    setEmail(vendor.email);
    setPassword('');
    setPhone(vendor.phone || '');
    setWhatsApp(vendor.whatsApp || '');
    setAccessLevel(vendor.accessLevel || 'LIMITED_ACCESS');
    setCommissionRate(vendor.commissionRate ?? 80);
    setSelectedPermissions(vendor.permissions || [...LIMITED_TIER_DEFAULT_PERMISSIONS]);
    setAssignedTournaments(vendor.assignedTournaments || []);
    setNotes(vendor.notes || '');
    setIsModalOpen(true);
  };

  const openPasswordModal = (vendor: VendorAccount) => {
    setPasswordTargetVendor(vendor);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
    let pass = '';
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewPassword(pass);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetVendor || !newPassword) return;

    setResettingPassword(true);
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: passwordTargetVendor.id,
          password: newPassword,
        }),
      });

      if (res.ok) {
        alert(`Password for @${passwordTargetVendor.vendorId} reset to:\n${newPassword}`);
        setIsPasswordModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to reset password.');
      }
    } catch {
      alert('Operation failed.');
    } finally {
      setResettingPassword(false);
    }
  };

  const togglePermission = (key: VendorPermissionKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleTournament = (tId: string) => {
    setAssignedTournaments((prev) =>
      prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId]
    );
  };

  const selectAllTournaments = () => {
    setAssignedTournaments(tournaments.map((t) => t.id));
  };

  const clearAllTournaments = () => {
    setAssignedTournaments([]);
  };

  const handleQuickTierToggle = async (vendor: VendorAccount) => {
    const nextTier: VendorAccessLevel = vendor.accessLevel === 'FULL_ACCESS' ? 'LIMITED_ACCESS' : 'FULL_ACCESS';
    const confirmMsg = nextTier === 'FULL_ACCESS'
      ? `Promote '${vendor.name}' (@${vendor.vendorId}) to FULL ACCESS tier?\nThis unlocks all tournament controls and auto-publishing.`
      : `Demote '${vendor.name}' (@${vendor.vendorId}) to LIMITED ACCESS tier?\nThis applies the limited permissions template.`;

    if (!confirm(confirmMsg)) return;

    try {
      const nextPerms = nextTier === 'FULL_ACCESS' ? FULL_TIER_DEFAULT_PERMISSIONS : LIMITED_TIER_DEFAULT_PERMISSIONS;
      const nextTournaments = nextTier === 'FULL_ACCESS' ? ['ALL'] : (vendor.assignedTournaments.filter(t => t !== 'ALL'));

      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: vendor.id,
          accessLevel: nextTier,
          permissions: nextPerms,
          assignedTournaments: nextTournaments.length > 0 ? nextTournaments : (tournaments.length > 0 ? [tournaments[0].id] : []),
        }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch {
      alert('Failed to change vendor tier.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingVendor) {
        // Update vendor
        const res = await fetch('/api/admin/vendors', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: editingVendor.id,
            name,
            orgName,
            password: password || undefined,
            phone,
            whatsApp,
            accessLevel,
            commissionRate: Number(commissionRate),
            permissions: selectedPermissions,
            assignedTournaments: accessLevel === 'FULL_ACCESS' ? ['ALL'] : assignedTournaments,
            notes,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          alert('Vendor account updated successfully!');
          setIsModalOpen(false);
          await loadData();
        } else {
          alert(data.message || 'Failed to update vendor.');
        }
      } else {
        // Create vendor
        const res = await fetch('/api/admin/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name,
            orgName: orgName || name,
            vendorId,
            email,
            password,
            phone,
            whatsApp,
            accessLevel,
            commissionRate: Number(commissionRate),
            permissions: selectedPermissions,
            assignedTournaments: accessLevel === 'FULL_ACCESS' ? ['ALL'] : assignedTournaments,
            notes,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          alert(`Vendor created successfully!\nVendor ID: ${vendorId}\nPassword: ${password}`);
          setIsModalOpen(false);
          await loadData();
        } else {
          alert(data.message || 'Failed to create vendor.');
        }
      }
    } catch {
      alert('Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (vendor: VendorAccount) => {
    const nextStatus = vendor.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: vendor.id,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch {
      alert('Failed to update vendor status.');
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor account? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/vendors?id=${vendorId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        alert('Vendor account deleted.');
        await loadData();
      }
    } catch {
      alert('Failed to delete vendor.');
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      v.name?.toLowerCase().includes(query) ||
      v.orgName?.toLowerCase().includes(query) ||
      v.vendorId?.toLowerCase().includes(query) ||
      v.email?.toLowerCase().includes(query) ||
      v.phone?.toLowerCase().includes(query);

    const matchesAccess = accessFilter === 'ALL' || v.accessLevel === accessFilter;
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;

    return matchesSearch && matchesAccess && matchesStatus;
  });

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.status === 'ACTIVE').length;
  const fullAccessVendors = vendors.filter((v) => v.accessLevel === 'FULL_ACCESS').length;
  const limitedAccessVendors = vendors.filter((v) => v.accessLevel === 'LIMITED_ACCESS').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 font-sans">
      
      {/* 1. Header Card */}
      <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shadow-sm flex-shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 leading-tight">
                VENDOR CREDENTIAL & ACCESS SYSTEM
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-mono font-bold border border-violet-200">
                SPEC COMPLIANT
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Admin-created credentials with <strong className="text-violet-700 font-semibold">Full Access</strong> (established hosts) & <strong className="text-amber-700 font-semibold">Limited Access</strong> (new host defaults), fine-tunable via granular permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Vendors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-600' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-heading font-bold text-xs shadow-md shadow-violet-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>CREATE VENDOR ACCOUNT</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-[20px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Vendors</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalVendors}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-[20px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Standing</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{activeVendors}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-[20px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Access Tier</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{fullAccessVendors}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-[20px] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Limited Access Tier</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{limitedAccessVendors}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('VENDORS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'VENDORS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Vendor Accounts Directory ({vendors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYOUTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PAYOUTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span>Vendor Payout Requests</span>
          {payoutRequests.filter(p => p.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black">
              {payoutRequests.filter(p => p.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'VENDORS' ? (
        <>
          {/* Search and Filters */}
          <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Org Name, Vendor ID (@VND-...), Name, or Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Access Tier Filter */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <span className="text-[10px] text-slate-400 uppercase px-2 font-bold">Tier:</span>
                {(['ALL', 'FULL_ACCESS', 'LIMITED_ACCESS'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setAccessFilter(lvl)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      accessFilter === lvl
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl === 'ALL' ? 'All' : lvl === 'FULL_ACCESS' ? 'Full Access' : 'Limited'}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <span className="text-[10px] text-slate-400 uppercase px-2 font-bold">Status:</span>
                {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vendors Table */}
          <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-violet-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="p-16 text-center text-slate-600 space-y-3">
                <Store className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-900 text-base">No Vendor Credentials Found</div>
                <div className="text-xs text-slate-500 max-w-sm mx-auto">
                  Create vendor logins for tournament hosts, room managers, and partner esports organizers.
                </div>
                <button
                  onClick={openCreateModal}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Create First Vendor Credential
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-5">Vendor ID & Username</th>
                      <th className="py-4 px-5">Organization & Contact</th>
                      <th className="py-4 px-5">Access Tier</th>
                      <th className="py-4 px-5">Commission Rate</th>
                      <th className="py-4 px-5">Permissions Matrix</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVendors.map((v) => {
                      const isFull = v.accessLevel === 'FULL_ACCESS';
                      const isAssignedAll = isFull || v.assignedTournaments?.includes('ALL');

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Vendor ID */}
                          <td className="py-4 px-5">
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-800 px-3 py-1 rounded-xl font-mono text-xs font-black shadow-2xs">
                                <span>@{v.vendorId}</span>
                                <button
                                  onClick={() => handleCopy(v.vendorId)}
                                  className="p-0.5 hover:bg-violet-100 rounded text-violet-600 transition-colors cursor-pointer"
                                  title="Copy Vendor ID"
                                >
                                  {copiedText === v.vendorId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">Created by: {v.createdBy || 'Owner'}</div>
                            </div>
                          </td>

                          {/* Organization & Contact */}
                          <td className="py-4 px-5">
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>{v.orgName || v.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{v.email}</span>
                              </div>
                              {(v.phone || v.whatsApp) && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{v.whatsApp || v.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Access Tier + Quick 1-Click Promote/Demote */}
                          <td className="py-4 px-5">
                            <div className="space-y-1.5">
                              {isFull ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black uppercase shadow-xs">
                                  <Sparkles className="w-3 h-3" />
                                  <span>Full Access</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>Limited Access</span>
                                </span>
                              )}
                              
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleQuickTierToggle(v)}
                                  className="text-[10px] font-bold text-violet-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                  title="1-Click Tier Change"
                                >
                                  <span>{isFull ? '↓ Demote to Limited' : '↑ Promote to Full'}</span>
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Commission Rate */}
                          <td className="py-4 px-5">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold">
                              <Percent className="w-3 h-3 text-emerald-600" />
                              <span>{v.commissionRate ?? 80}% Split</span>
                            </div>
                          </td>

                          {/* Permissions Matrix */}
                          <td className="py-4 px-5">
                            <div className="space-y-1.5 max-w-xs">
                              <div className="flex flex-wrap gap-1">
                                {isFull ? (
                                  <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-bold">
                                    Full Operations Unlocked
                                  </span>
                                ) : v.permissions && v.permissions.length > 0 ? (
                                  v.permissions.slice(0, 2).map((p) => (
                                    <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                      {p.replace(/_/g, ' ')}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400">No permissions</span>
                                )}
                                {!isFull && v.permissions && v.permissions.length > 2 && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold">
                                    +{v.permissions.length - 2} more
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-slate-400" />
                                {isAssignedAll ? (
                                  <span className="text-violet-700 font-bold">All Tournaments</span>
                                ) : (
                                  <span>{v.assignedTournaments?.length || 0} Tournament(s)</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5">
                            <button
                              onClick={() => handleToggleStatus(v)}
                              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                                v.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              }`}
                            >
                              {v.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openPasswordModal(v)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                title="Force Reset Password"
                              >
                                <KeyRound className="w-4 h-4 text-amber-600" />
                              </button>
                              <button
                                onClick={() => openEditModal(v)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                title="Edit Permissions & Details"
                              >
                                <Edit3 className="w-4 h-4 text-violet-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteVendor(v.id)}
                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                                title="Delete Vendor"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Payout Requests View */
        <div className="bg-white rounded-[24px] border border-[#E2E8F0] shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-heading font-black text-lg text-slate-900">Vendor Payout Cashout Queue</h2>
              <p className="text-xs text-slate-500">Escrow earnings released upon completed tournament review.</p>
            </div>
          </div>

          {payoutRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs space-y-2">
              <Coins className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700">No Payout Requests Pending</p>
              <p>When vendors request payout of completed tournament earnings, they will appear here for review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Vendor</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Method & Account</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {payoutRequests.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">{p.vendorName || p.vendorId}</td>
                      <td className="p-3.5 font-bold text-emerald-600 font-mono">৳ {p.amount.toLocaleString()}</td>
                      <td className="p-3.5 font-mono">{p.method} • {p.accountNumber}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Create / Edit Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-heading font-black text-xl text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-violet-600" />
                  <span>{editingVendor ? 'EDIT VENDOR ACCESS MATRIX' : 'CREATE VENDOR CREDENTIAL'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure organization, login ID, password, access tier, commission, and permitted actions.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              
              {/* Access Tier Selector (Limited vs Full) */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 uppercase tracking-wider block">
                  Select Access Tier Template *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Limited Access (New Vendor Default) */}
                  <div
                    onClick={() => handleTierSelect('LIMITED_ACCESS')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-1.5 ${
                      accessLevel === 'LIMITED_ACCESS'
                        ? 'border-amber-600 bg-amber-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-black text-sm text-slate-900 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span>LIMITED ACCESS (DEFAULT)</span>
                      </span>
                      {accessLevel === 'LIMITED_ACCESS' && <Check className="w-4 h-4 text-amber-600 font-black" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Default template for new vendors. Can create/manage own tournaments, update room passwords, and record match scores with admin review.
                    </p>
                  </div>

                  {/* Full Access */}
                  <div
                    onClick={() => handleTierSelect('FULL_ACCESS')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-1.5 ${
                      accessLevel === 'FULL_ACCESS'
                        ? 'border-violet-600 bg-violet-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-black text-sm text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                        <span>FULL ACCESS (TRUSTED)</span>
                      </span>
                      {accessLevel === 'FULL_ACCESS' && <Check className="w-4 h-4 text-violet-600 font-black" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      For trusted / internal hosts. Near-autonomous management, auto-published tournaments live, storefront profile editor, and custom fees.
                    </p>
                  </div>

                </div>
              </div>

              {/* Basic Credential Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Organization / Brand Name *</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    placeholder="e.g. BD Champions Esports"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-violet-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Rahim Ahmed"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-violet-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Username / Vendor ID *</label>
                    {!editingVendor && (
                      <button
                        type="button"
                        onClick={generateRandomVendorId}
                        className="text-[10px] font-bold text-violet-600 hover:underline cursor-pointer"
                      >
                        Auto-Generate
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    required
                    disabled={!!editingVendor}
                    placeholder="e.g. VND-1001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-violet-600 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vendor Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={!!editingVendor}
                    placeholder="vendor@blackrock.gg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-violet-600 disabled:opacity-60"
                  />
                </div>

                {!editingVendor && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Password *</label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[10px] font-bold text-violet-600 hover:underline cursor-pointer"
                      >
                        Generate Pass
                      </button>
                    </div>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-violet-600"
                    />
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Commission Split (% Vendor Cut)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-violet-600"
                    />
                    <span className="font-bold text-slate-500">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Vendor gets {commissionRate}%, Platform keeps {100 - commissionRate}%</p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp / Phone Number</label>
                  <input
                    type="text"
                    value={whatsApp}
                    onChange={(e) => setWhatsApp(e.target.value)}
                    placeholder="e.g. +8801700000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-violet-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Internal Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Partner organization hosting weekly squad cups"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-violet-600"
                  />
                </div>

              </div>

              {/* Granular Permission Matrix (Fine-Tunable Checkboxes) */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-heading font-black text-xs text-slate-900 uppercase">
                      Permission Matrix ({selectedPermissions.length} Enabled)
                    </span>
                    <p className="text-[11px] text-slate-500">Fine-tune individual permissions beyond the tier template.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTierSelect(accessLevel)}
                    className="text-[11px] font-bold text-violet-600 hover:underline cursor-pointer"
                  >
                    Reset to {accessLevel === 'FULL_ACCESS' ? 'Full' : 'Limited'} Template
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VENDOR_PERMISSIONS_LIST.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.key);
                    return (
                      <div
                        key={perm.key}
                        onClick={() => togglePermission(perm.key)}
                        className={`p-3 rounded-2xl border transition-all flex items-start space-x-3 select-none cursor-pointer ${
                          isChecked
                            ? 'bg-violet-50/80 border-violet-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 text-violet-600">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-violet-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-xs">{perm.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{perm.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tournament Assignment Grid (Only for Limited Tier) */}
                {accessLevel !== 'FULL_ACCESS' && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-black text-xs text-slate-900 uppercase">
                        Assigned Tournaments ({assignedTournaments.length})
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllTournaments}
                          className="text-[11px] font-bold text-violet-600 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={clearAllTournaments}
                          className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200 custom-scrollbar">
                      {tournaments.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 col-span-2">No tournaments created yet.</div>
                      ) : (
                        tournaments.map((t) => {
                          const isAssigned = assignedTournaments.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleTournament(t.id)}
                              className={`p-2.5 rounded-xl border transition-all flex items-center space-x-2.5 select-none cursor-pointer ${
                                isAssigned
                                  ? 'bg-violet-100 border-violet-300 text-violet-900 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div className="text-violet-600">
                                {isAssigned ? (
                                  <CheckSquare className="w-3.5 h-3.5" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </div>
                              <div className="flex-1 truncate text-xs">
                                <div>{t.title}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{t.mode} • ৳{t.entryFee}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Submit Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-md shadow-violet-500/20 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SAVE VENDOR CREDENTIAL</span>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5. Force Reset Password Modal */}
      {isPasswordModalOpen && passwordTargetVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">
                  Force Reset Vendor Password
                </h3>
                <p className="text-xs text-slate-500">Target: @{passwordTargetVendor.vendorId} ({passwordTargetVendor.name})</p>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">New Password *</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-violet-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>RESET PASSWORD</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
