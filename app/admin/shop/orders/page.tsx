'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Search, 
  Copy, 
  Check, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  MessageCircle, 
  RotateCcw, 
  Send, 
  Tag, 
  Loader2, 
  ShieldCheck, 
  DollarSign, 
  Coins, 
  ShoppingBag,
  Eye,
  Filter
} from 'lucide-react';

export default function AdminShopOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delivery / Refund Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [deliveryAction, setDeliveryAction] = useState<'DELIVER' | 'REFUND' | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/admin/shop', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const handleOrderPoll = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadOrders();
    };
    const interval = setInterval(handleOrderPoll, 30000);
    document.addEventListener('visibilitychange', handleOrderPoll);
    return () => {
      document.removeEventListener('visibilitychange', handleOrderPoll);
      clearInterval(interval);
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOrderAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !deliveryAction) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action: deliveryAction,
          voucherCode: voucherCodeInput.trim() || undefined,
          reason: actionReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedOrder(null);
        setDeliveryAction(null);
        setVoucherCodeInput('');
        setActionReason('');
        await loadOrders();
      } else {
        alert(data.message || 'Failed to update order.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error processing order.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: status }),
      });
      if (res.ok) await loadOrders();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const parseOrderDetails = (notes: string) => {
    const itemMatch = notes.match(/\[Shop Order\]\s*([^|]+)/i);
    const catMatch = notes.match(/Category:\s*([^|]+)/i);
    const uidMatch = notes.match(/UID:\s*([^|]+)/i);
    const ignMatch = notes.match(/IGN:\s*([^|]+)/i);
    const phoneMatch = notes.match(/Phone:\s*([^|]+)/i);
    const addressMatch = notes.match(/Address:\s*([^|]+)/i);
    const couponMatch = notes.match(/Coupon:\s*([^|]+)/i);
    const voucherMatch = notes.match(/\[Voucher:\s*([^\]]+)\]/i);

    return {
      itemName: itemMatch ? itemMatch[1].trim() : 'Shop Package',
      category: catMatch ? catMatch[1].trim() : 'DIAMONDS',
      uid: uidMatch ? uidMatch[1].trim() : '',
      ign: ignMatch ? ignMatch[1].trim() : '',
      phone: phoneMatch ? phoneMatch[1].trim() : '',
      address: addressMatch ? addressMatch[1].trim() : '',
      coupon: couponMatch ? couponMatch[1].trim() : '',
      voucherCode: voucherMatch ? voucherMatch[1].trim() : null,
    };
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedStatus !== 'ALL' && o.status !== selectedStatus) return false;
    const q = searchQuery.toLowerCase();
    const details = parseOrderDetails(o.notes || '');
    return (
      o.userName?.toLowerCase().includes(q) ||
      o.userEmail?.toLowerCase().includes(q) ||
      details.itemName.toLowerCase().includes(q) ||
      details.uid.toLowerCase().includes(q) ||
      details.phone.toLowerCase().includes(q) ||
      o.trxId?.toLowerCase().includes(q)
    );
  });

  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const processingCount = orders.filter(o => o.status === 'PROCESSING').length;
  const deliveredCount = orders.filter(o => o.status === 'VERIFIED').length;
  const rejectedCount = orders.filter(o => o.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-slate-900 flex items-center gap-2.5">
            <Package className="w-7 h-7 text-orange-500" />
            <span>Order Fulfillment & Delivery Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time live queue for Free Fire diamond top-ups, member passes, vouchers and merch deliveries.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadOrders}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/admin/shop"
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Products Catalog</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Action</span>
          </span>
          <div className="text-2xl font-heading font-black text-amber-900">{pendingCount}</div>
          <p className="text-[10px] text-amber-700">Waiting for admin verification</p>
        </div>

        <div className="p-4 bg-cyan-50/80 border border-cyan-200 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-cyan-800 uppercase flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-cyan-600" />
            <span>In Processing</span>
          </span>
          <div className="text-2xl font-heading font-black text-cyan-900">{processingCount}</div>
          <p className="text-[10px] text-cyan-700">Diamonds being dispatched</p>
        </div>

        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Delivered & Verified</span>
          </span>
          <div className="text-2xl font-heading font-black text-emerald-900">{deliveredCount}</div>
          <p className="text-[10px] text-emerald-700">Successfully fulfilled</p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            <span>Total Orders</span>
          </span>
          <div className="text-2xl font-heading font-black text-slate-900">{orders.length}</div>
          <p className="text-[10px] text-slate-500">{rejectedCount} cancelled / refunded</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4">
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Player UID, Phone, Item, Trx ID, Player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-orange-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'PENDING', label: `Pending (${pendingCount})` },
              { id: 'PROCESSING', label: `Processing (${processingCount})` },
              { id: 'VERIFIED', label: `Delivered (${deliveredCount})` },
              { id: 'REJECTED', label: 'Rejected' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedStatus === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500" />
            <p>Loading fulfillment orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700">No Orders Matching Filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Date & ID</th>
                  <th className="p-3.5">Purchased Item</th>
                  <th className="p-3.5">Target Player UID / IGN</th>
                  <th className="p-3.5">Customer & Phone</th>
                  <th className="p-3.5">Amount & Paid Method</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Fulfillment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const details = parseOrderDetails(order.notes || '');
                  const isCoins = order.method === 'COINS';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80">
                      
                      {/* Date & ID */}
                      <td className="p-3.5">
                        <div className="font-mono text-slate-900 font-bold">{order.trxId || order.id.slice(0, 12)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </td>

                      {/* Product */}
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{details.itemName}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{details.category}</span>
                      </td>

                      {/* UID & IGN */}
                      <td className="p-3.5">
                        {details.uid ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {details.uid}
                            </span>
                            <button
                              onClick={() => handleCopy(details.uid, `uid_${order.id}`)}
                              className="p-1 text-slate-400 hover:text-slate-700"
                              title="Copy UID"
                            >
                              {copiedId === `uid_${order.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">None</span>
                        )}
                        {details.ign && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">IGN: {details.ign}</div>
                        )}
                      </td>

                      {/* Customer & Phone */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{order.userName || 'Customer'}</div>
                        {details.phone ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-mono text-[11px] text-slate-600">{details.phone}</span>
                            <a
                              href={`https://wa.me/${details.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-0.5"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">{order.userEmail}</div>
                        )}
                        {details.address && (
                          <div className="text-[10px] text-amber-800 bg-amber-50 p-1 rounded mt-1 max-w-xs">
                            📍 {details.address}
                          </div>
                        )}
                      </td>

                      {/* Amount & Method */}
                      <td className="p-3.5">
                        <span className="font-heading font-black text-sm text-slate-900 block">
                          {isCoins ? `${order.amount} 🪙` : `৳${order.amount}`}
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${isCoins ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {isCoins ? 'EZBD Coins' : 'Wallet Cash'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 ${
                          order.status === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : order.status === 'PROCESSING'
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                            : order.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {order.status === 'VERIFIED' ? 'DELIVERED ✅' : order.status === 'PENDING' ? 'PENDING ⏳' : order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => handleQuickStatus(order.id, 'PROCESSING')}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-[11px] font-bold"
                          >
                            Mark Processing
                          </button>
                        )}

                        {(order.status === 'PENDING' || order.status === 'PROCESSING') && (
                          <>
                            <button
                              onClick={() => { setSelectedOrder(order); setDeliveryAction('DELIVER'); }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs"
                            >
                              Deliver ✅
                            </button>

                            <button
                              onClick={() => { setSelectedOrder(order); setDeliveryAction('REFUND'); }}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold"
                            >
                              Reject & Refund ❌
                            </button>
                          </>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ── DELIVER / REFUND MODAL ── */}
      {selectedOrder && deliveryAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-slate-900">
                  {deliveryAction === 'DELIVER' ? 'Confirm Delivery & Fulfill' : 'Reject Order & Instant Refund'}
                </h3>
                <p className="text-[11px] text-slate-500">Order ID: {selectedOrder.id}</p>
              </div>
              <button
                onClick={() => { setSelectedOrder(null); setDeliveryAction(null); }}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOrderAction} className="space-y-4 text-xs">
              
              {deliveryAction === 'DELIVER' ? (
                <>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-1">
                    <span className="font-bold block text-[11px]">Direct Free Fire UID Delivery</span>
                    <p className="text-[10px] text-emerald-800">
                      Confirming will mark this order as VERIFIED, and send a completion notification to the customer.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Digital Voucher / Redeem Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BDFF-9842-8921"
                      value={voucherCodeInput}
                      onChange={(e) => setVoucherCodeInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      If attached, the customer can view and copy this code in their "My Orders" tab.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-950 space-y-1">
                    <span className="font-bold block text-[11px]">100% Automated Customer Refund</span>
                    <p className="text-[10px] text-red-800">
                      Rejecting will automatically return <strong>{selectedOrder.method === 'COINS' ? `${selectedOrder.amount} Coins 🪙` : `৳${selectedOrder.amount}`}</strong> directly into the player&apos;s wallet account.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Reason for Rejection *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Incorrect Free Fire Player UID or out of stock..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setSelectedOrder(null); setDeliveryAction(null); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`px-6 py-2.5 rounded-xl text-white font-heading font-black text-xs uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 ${
                    deliveryAction === 'DELIVER'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{deliveryAction === 'DELIVER' ? 'Confirm Delivery' : 'Process Refund'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
