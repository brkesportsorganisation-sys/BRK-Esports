'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, X, Trash2, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { DeleteRequest } from '@/lib/types';

export default function AdminDeleteRequestsPage() {
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/admin/delete-requests');
      if (res.ok) {
        const data = await res.json();
        if (data.requests) {
          setRequests(data.requests);
        }
      }
    } catch (err) {
      console.warn('Failed to load delete requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    setProcessingId(requestId);
    try {
      const res = await fetch('/api/admin/delete-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Action executed successfully.');
        await loadRequests();
      } else {
        alert(data.message || 'Action failed.');
      }
    } catch {
      alert('Failed to process delete request.');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              OWNER DELETE-APPROVAL QUEUE
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve permanent data deletion requests submitted by Admins & Managers.
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
          Pending Approvals: <span className="text-red-600 font-black">{pendingRequests.length}</span>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-red-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <div className="font-bold text-slate-700">No Pending Delete Requests</div>
            <div className="text-xs">Your system is clean and all data deletion requests are clear.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4">Target Table / Item</th>
                  <th className="p-4">Requested By</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Owner Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Trash2 className="w-4 h-4 text-red-500" />
                        <span>{req.targetTitle || `${req.targetTable} #${req.targetId}`}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Table: {req.targetTable} • ID: {req.targetId}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-700 text-xs">{req.requestedByName || req.requestedBy}</div>
                      <div className="text-[11px] text-slate-400">{new Date(req.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-slate-600 italic">&quot;{req.reason || 'No reason provided'}&quot;</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${
                        req.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        req.status === 'APPROVED' ? 'bg-green-50 text-green-700 border border-green-200' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(req.id, 'APPROVE')}
                            disabled={processingId === req.id}
                            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Delete</span>
                          </button>
                          <button
                            onClick={() => handleAction(req.id, 'REJECT')}
                            disabled={processingId === req.id}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center space-x-1 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">
                          {req.status === 'APPROVED' ? `Deleted by ${req.approvedBy || 'Owner'}` : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
