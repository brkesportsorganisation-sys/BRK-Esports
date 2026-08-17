'use client';

import React, { useState, useEffect } from 'react';
import { 
  Diamond, 
  Search, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  Filter, 
  Coins, 
  DollarSign, 
  Gift, 
  Send,
  Loader2
} from 'lucide-react';

interface DiamondOrder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  method: string;
  amount: number;
  trxId: string;
  status: string;
  notes: string;
  createdAt: string;
}

export default function AdminDiamondShopPage() {
  const [orders, setOrders] = useState<DiamondOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deliverModalOrder, setDeliverModalOrder] = useState<DiamondOrder | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/admin/shop');
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
  }, []);

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverModalOrder) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: deliverModalOrder.id,
          action: 'DELIVER',
          redeemCode: redeemCode.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setDeliverModalOrder(null);
        setRedeemCode('');
        loadOrders();
      } else {
        alert(data.message || 'Failed to update order.');
      }
    } catch (err: any) {
      alert(err.message || 'Error processing delivery.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalCashRevenue = orders
    .filter(o => o.method !== 'COINS')
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const totalCoinsSpent = orders
    .filter(o => o.method === 'COINS')
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (
      o.userName?.toLowerCase().includes(q) ||
      o.userEmail?.toLowerCase().includes(q) ||
      o.notes?.toLowerCase().includes(q) ||
      o.trxId?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Diamond className="w-7 h-7 text-cyan-500" />
              Free Fire Diamond Orders Manager
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Fulfill incoming player diamond top-up requests, memberships, and voucher deliveries.
            </p>
          </div>

          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            Refresh Orders
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Diamond Revenue</span>
            <div className="text-2xl font-black text-emerald-600">৳ {totalCashRevenue.toLocaleString()}</div>
          </div>
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Coins Redeemed</span>
            <div className="text-2xl font-black text-amber-500">{totalCoinsSpent.toLocaleString()} 🪙</div>
          </div>
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Orders</span>
            <div className="text-2xl font-black text-slate-900">{orders.length}</div>
          </div>
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Completed</span>
            <div className="text-2xl font-black text-cyan-600">
              {orders.filter(o => o.status === 'VERIFIED').length}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by player name, email, or UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:bg-white focus:border-cyan-500"
              />
            </div>
            <span className="text-xs text-slate-500">Showing {filteredOrders.length} orders</span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400">Loading diamond orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-16 text-center text-slate-400">No diamond orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Player Info</th>
                    <th className="px-4 py-3">Order Details / UID</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{order.userName}</div>
                        <div className="text-[11px] text-slate-500">{order.userEmail}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{order.notes}</div>
                        <div className="text-[10px] text-slate-400 font-mono">TrxID: {order.trxId}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.method === 'COINS'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {order.method === 'COINS' ? `${order.amount} Coins` : `৳${order.amount}`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setDeliverModalOrder(order)}
                          className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg text-xs font-bold transition-all"
                        >
                          Send Code / Deliver
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

      {/* Deliver Modal */}
      {deliverModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Diamond className="w-5 h-5 text-cyan-500" />
              Fulfill Diamond Order
            </h3>
            <p className="text-xs text-slate-600">
              Order for <strong>{deliverModalOrder.userName}</strong> ({deliverModalOrder.notes})
            </p>

            <form onSubmit={handleDeliver} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Voucher / Redeem Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. FFBD-8910-XQ72 (Leave blank if delivered directly to UID)"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeliverModalOrder(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Confirm & Notify Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
