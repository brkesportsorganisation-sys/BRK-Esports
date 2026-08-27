'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  Percent, 
  DollarSign, 
  Sparkles, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Loader2, 
  RefreshCw,
  Gift,
  ShieldCheck,
  AlertCircle,
  Tag
} from 'lucide-react';
import { ShopCoupon } from '@/lib/types';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<ShopCoupon[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [discountVal, setDiscountVal] = useState<number>(10);
  const [minOrderBdt, setMinOrderBdt] = useState<number>(50);
  const [maxUses, setMaxUses] = useState<number>(100);
  const [expiryDate, setExpiryDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.warn('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setCode('');
    setDiscountType('PERCENT');
    setDiscountVal(10);
    setMinOrderBdt(50);
    setMaxUses(100);
    setExpiryDate('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (coupon: ShopCoupon) => {
    setIsEditing(true);
    setEditingId(coupon.id);
    setCode(coupon.code);
    if (coupon.discountPercent) {
      setDiscountType('PERCENT');
      setDiscountVal(coupon.discountPercent);
    } else {
      setDiscountType('FLAT');
      setDiscountVal(coupon.discountAmountBdt || 0);
    }
    setMinOrderBdt(coupon.minOrderBdt || 0);
    setMaxUses(coupon.maxUses || 100);
    setExpiryDate(coupon.expiryDate || '');
    setIsActive(coupon.isActive);
    setModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      alert('Please enter a valid coupon code');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        discountPercent: discountType === 'PERCENT' ? Number(discountVal) : undefined,
        discountAmountBdt: discountType === 'FLAT' ? Number(discountVal) : undefined,
        minOrderBdt: minOrderBdt ? Number(minOrderBdt) : undefined,
        maxUses: maxUses ? Number(maxUses) : undefined,
        expiryDate: expiryDate || undefined,
        isActive,
      };

      let res;
      if (isEditing && editingId) {
        res = await fetch('/api/admin/coupons', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'EDIT', couponId: editingId, ...payload }),
        });
      } else {
        res = await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        await loadCoupons();
      } else {
        alert(data.message || 'Failed to save coupon.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving coupon.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (couponId: string) => {
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE', couponId }),
      });
      if (res.ok) await loadCoupons();
    } catch (err) {
      console.error('Error toggling coupon:', err);
    }
  };

  const handleDelete = async (couponId: string, codeName: string) => {
    if (!confirm(`Are you sure you want to permanently delete coupon "${codeName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${couponId}`, { method: 'DELETE' });
      if (res.ok) await loadCoupons();
    } catch (err) {
      console.error('Error deleting coupon:', err);
    }
  };

  const filteredCoupons = coupons.filter(c => {
    const q = searchQuery.trim().toLowerCase();
    return q === '' || c.code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-pink-500" />
            <span>Shop Promo & Coupon Code Manager</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create promotional discount codes for Free Fire diamonds, memberships, and gaming merch.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadCoupons}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Coupons</span>
          <div className="text-2xl font-heading font-black text-slate-900">{coupons.length}</div>
          <p className="text-[10px] text-slate-500">Configured in system</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Active Coupons</span>
          <div className="text-2xl font-heading font-black text-emerald-600">
            {coupons.filter(c => c.isActive).length}
          </div>
          <p className="text-[10px] text-slate-500">Ready for player checkout</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Redemptions</span>
          <div className="text-2xl font-heading font-black text-pink-600">
            {coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)}
          </div>
          <p className="text-[10px] text-slate-500">Times redeemed by players</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Average Discount</span>
          <div className="text-2xl font-heading font-black text-amber-600">
            {coupons.length > 0
              ? `${Math.round(coupons.reduce((sum, c) => sum + (c.discountPercent || (c.discountAmountBdt ? 15 : 0)), 0) / coupons.length)}%`
              : '0%'}
          </div>
          <p className="text-[10px] text-slate-500">Across all active codes</p>
        </div>
      </div>

      {/* ── Coupon Catalog Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        
        {/* Search & Counter */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search coupon code (e.g. BOOYAH50, COOLER20)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-pink-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-bold">
            Showing {filteredCoupons.length} coupons
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-xs space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-pink-500" />
            <p>Loading promo coupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs space-y-3">
            <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">No Coupons Found</p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-pink-500 text-white font-bold text-xs"
            >
              Create First Coupon
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">Coupon Code</th>
                  <th className="p-4">Discount Value</th>
                  <th className="p-4">Min. Order</th>
                  <th className="p-4">Usage & Limits</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCoupons.map((coupon) => {
                  const isPct = Boolean(coupon.discountPercent);
                  const isMaxed = coupon.maxUses && coupon.usedCount >= coupon.maxUses;

                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50/60">
                      
                      {/* Code */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-pink-50 text-pink-700 font-mono font-black text-xs border border-pink-200 shadow-2xs">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => handleCopy(coupon.code)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900"
                            title="Copy Code"
                          >
                            {copiedCode === coupon.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Discount Value */}
                      <td className="p-4">
                        <span className="font-heading font-black text-sm text-slate-900">
                          {isPct ? `${coupon.discountPercent}% OFF` : `৳${coupon.discountAmountBdt} FLAT`}
                        </span>
                      </td>

                      {/* Min Spend */}
                      <td className="p-4 font-mono font-bold text-slate-600">
                        {coupon.minOrderBdt ? `৳${coupon.minOrderBdt}` : 'No Minimum'}
                      </td>

                      {/* Usage & Limits */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-900 font-bold">{coupon.usedCount || 0} used</span>
                            <span className="text-slate-400">of {coupon.maxUses || '∞'} limit</span>
                          </div>
                          {coupon.maxUses && (
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isMaxed ? 'bg-red-500' : 'bg-pink-500'}`}
                                style={{ width: `${Math.min(100, ((coupon.usedCount || 0) / coupon.maxUses) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(coupon.id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all ${
                            coupon.isActive && !isMaxed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {coupon.isActive && !isMaxed ? 'Active ✅' : isMaxed ? 'Limit Reached ⚠️' : 'Disabled ⏸️'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(coupon)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDelete(coupon.id, coupon.code)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ── CREATE / EDIT COUPON MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-slate-900">
                    {isEditing ? 'Edit Promo Coupon' : 'Create Promo Coupon'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure discount code for player orders</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              
              {/* Code */}
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BOOYAH50 or COOLER20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono font-black uppercase text-sm focus:outline-none focus:bg-white focus:border-pink-500"
                />
              </div>

              {/* Discount Type */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENT')}
                  className={`p-3 rounded-xl border text-center font-bold transition-all ${
                    discountType === 'PERCENT'
                      ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <Percent className="w-4 h-4 mx-auto mb-1 text-pink-500" />
                  <span>Percentage (%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscountType('FLAT')}
                  className={`p-3 rounded-xl border text-center font-bold transition-all ${
                    discountType === 'FLAT'
                      ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <DollarSign className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                  <span>Flat Taka (৳ BDT)</span>
                </button>
              </div>

              {/* Discount Value & Min Spend */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {discountType === 'PERCENT' ? 'Discount Rate (%) *' : 'Discount Amount (৳) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === 'PERCENT' ? 100 : 10000}
                    value={discountVal}
                    onChange={(e) => setDiscountVal(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Min. Spend (৳ BDT)</label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderBdt}
                    onChange={(e) => setMinOrderBdt(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Max Uses */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Max Total Uses Limit</label>
                <input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold"
                />
              </div>

              {/* Active Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Enable Coupon for Players</span>
                  <span className="text-[10px] text-slate-500">Players can apply this during checkout</span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-pink-500 rounded cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isEditing ? 'Save Changes' : 'Create Coupon'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
