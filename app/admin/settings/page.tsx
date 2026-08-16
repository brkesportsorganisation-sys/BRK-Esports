'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Settings, Save, CheckCircle2, ShieldCheck, Phone, CreditCard } from 'lucide-react';
import { Settings, Save, CheckCircle2, ShieldCheck, Phone, CreditCard, PlaySquare } from 'lucide-react';
import { db } from '@/lib/db';

export default function AdminSettingsPage() {
  const [siteName, setSiteName] = useState('Black Rock Tournaments');
  const [bkashNo, setBkashNo] = useState('01712-998877');
  const [nagadNo, setNagadNo] = useState('01812-998877');
  const [rocketNo, setRocketNo] = useState('01912-998877');
  const [helpline, setHelpline] = useState('+880 1712-998877');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] p-4 text-slate-900 lg:p-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500 font-semibold">Platform Configuration</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">System Settings</h1>
            <p className="mt-2 text-sm text-slate-500">Configure site branding, payment agent numbers, and maintenance controls.</p>
          </div>
        </div>

        <div className="space-y-8 max-w-4xl">
          {savedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Platform configuration saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-8 text-sm">
            
            {/* General Branding */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h3 className="font-heading font-extrabold text-xl text-slate-900 mb-6">Platform Branding</h3>
              <div>
                <label className="font-semibold text-slate-700 block mb-2">Platform Name</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-300 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Mobile Banking Agent Numbers */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h3 className="font-heading font-extrabold text-xl text-slate-900 mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-orange-500" /> Mobile Banking Agent Numbers
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="font-semibold text-pink-600 block mb-2">bKash Send Money No.</label>
                  <input
                    type="text"
                    value={bkashNo}
                    onChange={(e) => setBkashNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-300 transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="font-semibold text-orange-600 block mb-2">Nagad Send Money No.</label>
                  <input
                    type="text"
                    value={nagadNo}
                    onChange={(e) => setNagadNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-300 transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="font-semibold text-purple-600 block mb-2">Rocket Send Money No.</label>
                  <input
                    type="text"
                    value={rocketNo}
                    onChange={(e) => setRocketNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-300 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Support Helpline */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h3 className="font-heading font-extrabold text-xl text-slate-900 mb-6 flex items-center gap-2">
                <Phone className="w-6 h-6 text-emerald-500" /> 24/7 Helpline & Support
              </h3>
              <div>
                <label className="font-semibold text-slate-700 block mb-2">Support Contact Number</label>
                <input
                  type="text"
                  value={helpline}
                  onChange={(e) => setHelpline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-300 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900 text-base">System Maintenance Mode</div>
                  <div className="text-sm text-slate-500 mt-1">Temporarily block tournament registrations for maintenance</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm ${
                    maintenanceMode ? 'bg-red-500 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {maintenanceMode ? 'MAINTENANCE ACTIVE' : 'SYSTEM ONLINE'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-base shadow-md flex items-center justify-center space-x-2 hover:shadow-lg transition-all"
            >
              <Save className="w-5 h-5" />
              <span>Save System Settings</span>
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
