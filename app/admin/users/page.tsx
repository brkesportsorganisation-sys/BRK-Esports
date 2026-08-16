'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, ShieldAlert, CheckCircle2, Ban, Edit3, Wallet, Coins, Plus, X, Shield } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import Footer from '@/components/ui/Footer';
import { db } from '@/lib/db';
import { User, Role } from '@/lib/types';

const adminSections = [
  { id: '/admin', label: 'Overview' },
  { id: '/admin/tournaments', label: 'Tournaments' },
  { id: '/admin/registrations', label: 'Registrations' },
  { id: '/admin/notifications', label: 'Notifications' },
  { id: '/admin/users', label: 'Users' },
  { id: '/admin/payments', label: 'Payments' },
  { id: '/admin/ads', label: 'Ad Management' },
  { id: '/admin/settings', label: 'Settings' }
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorForm, setVendorForm] = useState({ name: '', email: '', password: '', inGameName: '' });
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorMessage, setVendorMessage] = useState('');

  // Fund Modal State
  const [fundModal, setFundModal] = useState<{ isOpen: boolean; userId: string; type: 'WALLET' | 'COINS'; amount: number }>({
    isOpen: false,
    userId: '',
    type: 'WALLET',
    amount: 100,
  });

  // Permissions Modal State
  const [permissionsModal, setPermissionsModal] = useState<{ isOpen: boolean; user: User | null; role: Role; password: string; adminPermissions: string[] }>({
    isOpen: false,
    user: null,
    role: 'USER',
    password: '',
    adminPermissions: []
  });

  useEffect(() => {
    setUsers([...db.getUsers()]);
  }, []);

  const refreshUsers = () => setUsers([...db.getUsers()]);

  const handleBanToggle = (id: string) => {
    db.toggleBanUser(id);
    refreshUsers();
  };

  const handleRoleChange = (id: string, role: Role) => {
    db.updateUser(id, { role });
    refreshUsers();
  };

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find(u => u.id === fundModal.userId);
    if (!targetUser) return;

    if (fundModal.type === 'WALLET') {
      db.updateUser(fundModal.userId, { walletBalance: targetUser.walletBalance + fundModal.amount });
    } else {
      const currentCoins = targetUser.coinBalance || 0;
      db.updateUser(fundModal.userId, { coinBalance: currentCoins + fundModal.amount });
    }

    setFundModal({ ...fundModal, isOpen: false });
    refreshUsers();
  };

  const openPermissionsModal = (user: User) => {
    setPermissionsModal({
      isOpen: true,
      user,
      role: user.role,
      password: user.password || '',
      adminPermissions: user.adminPermissions || []
    });
  };

  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionsModal.user) return;
    
    db.updateUser(permissionsModal.user.id, {
      role: permissionsModal.role,
      password: permissionsModal.password,
      adminPermissions: permissionsModal.adminPermissions
    });
    
    setPermissionsModal({ ...permissionsModal, isOpen: false });
    refreshUsers();
  };

  const handleVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = vendorForm.name.trim();
    const email = vendorForm.email.trim();
    const password = vendorForm.password.trim();

    if (!name || !email || !password) {
      setVendorMessage('Vendor name, email and password are required.');
      return;
    }

    if (editingVendorId) {
      const updated = db.updateUser(editingVendorId, {
        name,
        email,
        password,
        inGameName: vendorForm.inGameName.trim() || name,
      });
      if (!updated) {
        setVendorMessage('Unable to update this vendor.');
        return;
      }
      setVendorMessage('Vendor account updated successfully.');
    } else {
      const created = db.createVendor({
        name,
        email,
        password,
        inGameName: vendorForm.inGameName.trim() || name,
      });
      if (!created) {
        setVendorMessage('This vendor email already exists.');
        return;
      }
      setVendorMessage('New vendor account created successfully.');
    }

    setVendorForm({ name: '', email: '', password: '', inGameName: '' });
    setEditingVendorId(null);
    refreshUsers();
  };

  const startVendorEdit = (vendor: User) => {
    setEditingVendorId(vendor.id);
    setVendorForm({
      name: vendor.name,
      email: vendor.email,
      password: vendor.password || '',
      inGameName: vendor.inGameName,
    });
    setVendorMessage('Editing vendor account.');
  };

  const vendorUsers = users.filter((u) => u.role === 'VENDOR');

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.freeFireUid && u.freeFireUid.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-slate-900 flex flex-col font-body">
      <Navbar />

      <div className="bg-white border-b border-slate-200 py-8 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading font-black text-3xl text-slate-900">USER & PLAYER MANAGEMENT</h1>
          <div className="text-xs text-slate-500 font-medium mt-1">Manage user roles, ban toxic players, and inspect Free Fire UIDs</div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
            <Link href="/admin" className="px-4 py-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs transition-colors">
              Overview & Analytics
            </Link>
            <Link href="/admin/tournaments" className="px-4 py-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs transition-colors">
              Tournament Manager
            </Link>
            <Link href="/admin/payments" className="px-4 py-2 rounded-xl bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs transition-colors">
              Payment Verification
            </Link>
            <Link href="/admin/users" className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs shadow-sm transition-colors">
              User Manager ({users.length})
            </Link>
          </div>

          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, email, or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">Vendor Management</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Create or update vendor access</h2>
            </div>
          </div>

          <form onSubmit={handleVendorSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Vendor Name</label>
              <input
                value={vendorForm.name}
                onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                placeholder="Vendor Alpha"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">In-game Name</label>
              <input
                value={vendorForm.inGameName}
                onChange={(e) => setVendorForm({ ...vendorForm, inGameName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                placeholder="VENDOR_ALPHA"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Vendor Email</label>
              <input
                type="email"
                value={vendorForm.email}
                onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                placeholder="vendor@blackrock.gg"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Password</label>
              <input
                type="text"
                value={vendorForm.password}
                onChange={(e) => setVendorForm({ ...vendorForm, password: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                placeholder="vendor123"
              />
            </div>

            <div className="md:col-span-4 flex items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition-colors shadow-sm"
              >
                {editingVendorId ? 'Update Vendor' : 'Create Vendor'}
              </button>

              {editingVendorId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVendorId(null);
                    setVendorForm({ name: '', email: '', password: '', inGameName: '' });
                    setVendorMessage('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          {vendorMessage && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {vendorMessage}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {vendorUsers.map((vendor) => (
              <div key={vendor.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-900">{vendor.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{vendor.email}</p>
                  </div>
                  <button
                    onClick={() => startVendorEdit(vendor)}
                    className="rounded-lg bg-white border border-slate-200 shadow-sm px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Edit
                  </button>
                </div>

                <div className="mt-3 rounded-xl bg-white border border-slate-100 shadow-sm p-3 text-xs text-slate-600">
                  <div className="flex justify-between gap-3 py-1">
                    <span className="text-slate-400 font-medium">Password</span>
                    <span className="font-semibold text-slate-900">{vendor.password || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between gap-3 py-1">
                    <span className="text-slate-400 font-medium">In-game</span>
                    <span className="font-semibold text-slate-900">{vendor.inGameName || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4">Player Details</th>
                  <th className="p-4">Free Fire UID</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Balances</th>
                  <th className="p-4">Kills / Wins</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-sm" />
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.inGameName && <span className="text-[10px] text-red-500 font-mono">({u.inGameName})</span>}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-xs text-slate-700 font-semibold">{u.freeFireUid || 'Not Set'}</td>

                    <td className="p-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="bg-white border border-slate-200 shadow-sm rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all cursor-pointer"
                      >
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="VENDOR">VENDOR</option>
                      </select>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <Wallet className="w-3.5 h-3.5 text-brand-orange" />
                          <span className="font-heading font-extrabold text-slate-900">৳ {u.walletBalance}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Coins className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="font-heading font-extrabold text-slate-900">{u.coinBalance || 0}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-xs font-bold text-slate-600">{u.totalKills} Kills • {u.totalWins} Wins</td>

                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPermissionsModal(u)}
                        className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 hover:text-indigo-700 hover:border-indigo-300 transition-colors"
                        title="Edit Roles & Permissions"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setFundModal({ isOpen: true, userId: u.id, type: 'WALLET', amount: 100 })}
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-brand-orange hover:border-brand-orange transition-colors"
                        title="Add Funds"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleBanToggle(u.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${
                          u.isBanned
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        {u.isBanned ? 'UNBAN USER' : 'BAN PLAYER'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Permissions Modal */}
      {permissionsModal.isOpen && permissionsModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-heading font-black text-lg text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Roles & Permissions
              </h3>
              <button 
                onClick={() => setPermissionsModal({ ...permissionsModal, isOpen: false, user: null })}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePermissions} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Role</label>
                <select
                  value={permissionsModal.role}
                  onChange={(e) => setPermissionsModal({ ...permissionsModal, role: e.target.value as Role })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="USER">USER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="VENDOR">VENDOR</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Admin/Login Password</label>
                <input
                  type="text"
                  value={permissionsModal.password}
                  onChange={(e) => setPermissionsModal({ ...permissionsModal, password: e.target.value })}
                  placeholder="Set a password for this user"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">They will use this password and their email to login.</p>
              </div>

              {permissionsModal.role === 'MODERATOR' && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-3">Moderator Access</label>
                  <div className="grid grid-cols-2 gap-3">
                    {adminSections.map((section) => (
                      <label key={section.id} className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissionsModal.adminPermissions.includes(section.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPermissionsModal({ ...permissionsModal, adminPermissions: [...permissionsModal.adminPermissions, section.id] });
                            } else {
                              setPermissionsModal({ ...permissionsModal, adminPermissions: permissionsModal.adminPermissions.filter(id => id !== section.id) });
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {section.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {permissionsModal.role === 'ADMIN' && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 flex items-start gap-2">
                   <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                   Admins have full access to all sections and settings.
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-black text-sm py-3 rounded-xl transition-colors"
                >
                  SAVE PERMISSIONS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fund Modal */}
      {fundModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-heading font-black text-lg text-slate-900">Add Balance</h3>
              <button 
                onClick={() => setFundModal({ ...fundModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddFunds} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Currency Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFundModal({ ...fundModal, type: 'WALLET' })}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      fundModal.type === 'WALLET' ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                    <span className="text-xs font-bold">Wallet (Tk)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundModal({ ...fundModal, type: 'COINS' })}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      fundModal.type === 'COINS' ? 'border-yellow-500 bg-yellow-50 text-yellow-600' : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Coins className="w-5 h-5" />
                    <span className="text-xs font-bold">Tournament Coins</span>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Amount</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={fundModal.amount}
                  onChange={(e) => setFundModal({ ...fundModal, amount: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-orange transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-sm py-3 rounded-xl transition-colors"
                >
                  ADD {fundModal.amount} {fundModal.type === 'WALLET' ? 'TK' : 'COINS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
