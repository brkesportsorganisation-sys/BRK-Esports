'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
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
  AlertCircle
} from 'lucide-react';
import { AdminAccount, AdminPermissionKey } from '@/lib/types';

interface PermissionMeta {
  key: AdminPermissionKey;
  label: string;
  category: string;
  description: string;
  isOwnerOnly?: boolean;
}

const PERMISSIONS_LIST: PermissionMeta[] = [
  { key: 'view_dashboard', label: 'View Dashboard & Analytics', category: 'Dashboard', description: 'Access overview statistics and analytics cards.' },
  { key: 'manage_tournaments', label: 'Manage Tournaments & Slots', category: 'Tournaments', description: 'Create, update, and manage tournaments & slot sessions.' },
  { key: 'enter_results', label: 'Enter Match Results & Points', category: 'Tournaments', description: 'Submit match kill counts, placements, and scores.' },
  { key: 'manage_users', label: 'Manage User Profiles', category: 'Users', description: 'Search and inspect player profiles and account details.' },
  { key: 'manage_bans', label: 'Manage Bans & Suspensions', category: 'Users', description: 'Suspend/ban players (gated by delete-request workflow).' },
  { key: 'moderate_lfg', label: 'Moderate LFG & Recruitment', category: 'Users', description: 'Moderate squad posts, clear spam, reset pending locks.' },
  { key: 'manage_deposits', label: 'Verify Mobile Deposits', category: 'Finance', description: 'Review and verify bKash/Nagad TrxID deposit queue.' },
  { key: 'manage_withdrawals', label: 'Approve Winning Cashouts', category: 'Finance', description: 'Approve and execute Winning Wallet payout withdrawals.' },
  { key: 'adjust_wallets', label: 'Manual Balance Adjustments', category: 'Finance', description: 'Add/deduct player wallet balance with audit logging.' },
  { key: 'view_financial_reports', label: 'View Financial & Revenue Reports', category: 'Finance', description: 'Inspect revenue, deposits, payouts, and margins.' },
  { key: 'manage_referrals', label: 'Manage Referral Program', category: 'Rewards', description: 'Configure referral milestone targets and rewards.' },
  { key: 'manage_watch_earn', label: 'Manage Watch & Earn Ads', category: 'Rewards', description: 'Manage YouTube video rewards and watch durations.' },
  { key: 'send_notifications', label: 'Send Announcements & Alerts', category: 'Content', description: 'Publish site notices and push alerts.' },
  { key: 'manage_settings', label: 'Manage Site Settings', category: 'System', description: 'Configure bKash numbers, min deposit, and platform branding.' },
  { key: 'manage_roles', label: 'Manage Sub-Admin Roles', category: 'Security', description: 'Platform Owner only (Cannot be delegated).', isOwnerOnly: true },
  { key: 'approve_deletes', label: 'Approve Delete Requests', category: 'Security', description: 'Platform Owner only (Cannot be delegated).', isOwnerOnly: true },
];

export default function AdminRolesPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermissionKey[]>([
    'view_dashboard',
    'manage_tournaments',
    'enter_results',
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/admin/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.accounts) {
          setAccounts(data.accounts);
        }
      }
    } catch (err) {
      console.warn('Failed to load sub-admin accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setUsername('');
    setPassword('');
    setDisplayName('');
    setSelectedPermissions(['view_dashboard', 'manage_tournaments', 'enter_results']);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: AdminAccount) => {
    setEditingId(acc.id);
    setUsername(acc.username);
    setPassword('');
    setDisplayName(acc.displayName);
    setSelectedPermissions(acc.permissions || []);
    setIsModalOpen(true);
  };

  const togglePermission = (key: AdminPermissionKey) => {
    if (key === 'manage_roles' || key === 'approve_deletes') return; // Owner-only locked
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const selectAllPermissions = () => {
    const delegatable = PERMISSIONS_LIST.filter((p) => !p.isOwnerOnly).map((p) => p.key);
    setSelectedPermissions(delegatable);
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        // Update account
        const res = await fetch('/api/admin/accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: editingId,
            displayName,
            password: password || undefined,
            permissions: selectedPermissions,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          alert('Sub-admin account updated successfully!');
          setIsModalOpen(false);
          await loadAccounts();
        } else {
          alert(data.message || 'Failed to update account.');
        }
      } else {
        // Create account
        const res = await fetch('/api/admin/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            displayName,
            permissions: selectedPermissions,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          alert('Sub-admin account created successfully!');
          setIsModalOpen(false);
          await loadAccounts();
        } else {
          alert(data.message || 'Failed to create account.');
        }
      }
    } catch {
      alert('Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (account: AdminAccount) => {
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          isActive: !account.isActive,
        }),
      });

      if (res.ok) {
        await loadAccounts();
      }
    } catch {
      alert('Failed to update account status.');
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this sub-admin credential?')) return;

    try {
      const res = await fetch(`/api/admin/accounts?id=${accountId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Sub-admin account removed.');
        await loadAccounts();
      }
    } catch {
      alert('Failed to delete account.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              SUB-ADMIN ROLES & PERMISSION MATRIX
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create custom username credentials and assign granular Discord-style menu permissions.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs shadow-sm transition-all flex items-center space-x-2"
        >
          <UserPlus className="w-4 h-4 text-indigo-400" />
          <span>CREATE SUB-ADMIN CREDENTIAL</span>
        </button>
      </div>

      {/* Security Notice Card */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Discord-Style Granular Access:</strong> Sub-admins logging in with their username only see and access the exact menus checked in their matrix. Destructive actions (deletions) automatically route through the Owner Approval Queue.
        </div>
      </div>

      {/* Sub-Admin Accounts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-slate-600 space-y-2">
            <KeyRound className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="font-bold text-slate-900 text-base">No Sub-Admin Credentials Created Yet</div>
            <div className="text-xs font-medium">Create dedicated logins for moderators, tournament hosts, and payment handlers.</div>
            <button
              onClick={openCreateModal}
              className="mt-3 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              Create First Sub-Admin
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-4">Sub-Admin</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Granted Permissions</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs">
                          {acc.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{acc.displayName}</div>
                          <div className="text-[10px] text-slate-600 font-medium">Created: {new Date(acc.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-600 text-xs">
                      @{acc.username}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {acc.permissions && acc.permissions.length > 0 ? (
                          acc.permissions.slice(0, 3).map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold">
                              {p.replace(/_/g, ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">No permissions</span>
                        )}
                        {acc.permissions && acc.permissions.length > 3 && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                            +{acc.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(acc)}
                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase transition-all ${
                          acc.isActive
                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {acc.isActive ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(acc)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Edit Permissions"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc.id)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Sub-Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-heading font-black text-xl text-slate-900">
                  {editingId ? 'EDIT SUB-ADMIN CREDENTIALS' : 'CREATE SUB-ADMIN CREDENTIAL'}
                </h3>
                <p className="text-xs text-slate-500">Assign Discord-style permission checkboxes for this account.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              
              {/* Account Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Display Name *</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="e.g. Moderator Rahim"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Username (Login ID) *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={!!editingId}
                    placeholder="e.g. rahim_mod"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono font-bold disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {editingId ? 'New Password (Optional)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingId}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Permission Matrix Checkbox Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black text-sm text-slate-900 uppercase">
                    Granted Permissions ({selectedPermissions.length})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                  {PERMISSIONS_LIST.map((perm) => {
                    const isSelected = selectedPermissions.includes(perm.key);
                    const isLocked = perm.isOwnerOnly;

                    return (
                      <div
                        key={perm.key}
                        onClick={() => !isLocked && togglePermission(perm.key)}
                        className={`p-3 rounded-2xl border transition-all flex items-start space-x-3 select-none ${
                          isLocked
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-50/80 border-indigo-300 cursor-pointer shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <div className="mt-0.5 text-indigo-600">
                          {isLocked ? (
                            <Lock className="w-4 h-4 text-slate-400" />
                          ) : isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                            <span>{perm.label}</span>
                            {isLocked && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">
                                OWNER ONLY
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {perm.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SAVE CREDENTIAL</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
