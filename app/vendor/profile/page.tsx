'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { 
  Store, 
  ArrowLeft, 
  Save, 
  Building2, 
  Mail, 
  Phone, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Image as ImageIcon
} from 'lucide-react';

function VendorProfileContent() {
  const [profile, setProfile] = useState<any>(null);
  const [orgName, setOrgName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [logo, setLogo] = useState('');
  const [banner, setBanner] = useState('');
  const [bio, setBio] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/vendor/profile', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const p = data.profile;
        setProfile(p);
        setOrgName(p.orgName || p.name || '');
        setPhone(p.phone || '');
        setWhatsApp(p.whatsApp || '');
        setLogo(p.logo || '');
        setBanner(p.banner || '');
        setBio(p.bio || '');
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/vendor/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orgName,
          phone,
          whatsApp,
          logo,
          banner,
          bio,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Storefront profile updated successfully!');
        await loadProfile();
      } else {
        setErrorMessage(data.message || 'Failed to update profile.');
      }
    } catch {
      setErrorMessage('Network error while updating storefront profile.');
    } finally {
      setSaving(false);
    }
  };

  const isFull = profile?.accessLevel === 'FULL_ACCESS';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-fuchsia-400 font-bold">
              PUBLIC STOREFRONT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-heading">
            My Public Vendor Profile
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Customize your esports organization storefront, brand logo, banner, and public bio.
          </p>
        </div>

        <Link
          href="/vendor"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Tier Notice */}
      {!isFull && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-white font-bold">Limited Tier Notice:</strong> Direct storefront brand customization is available for Full Access vendors. Changes submitted here will be reviewed by the Owner.
          </div>
        </div>
      )}

      {/* Profile Form Card */}
      <div className="rounded-3xl border border-slate-800 bg-[#0C101A] p-6 sm:p-8 shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-violet-400 font-mono text-xs">LOADING STOREFRONT PROFILE...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              <div>
                <label className="mb-1.5 block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Organization / Brand Name *
                </label>
                <div className="flex items-center rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3 focus-within:border-fuchsia-500 transition-colors">
                  <Building2 className="mr-2.5 h-4 w-4 text-fuchsia-400" />
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder-slate-600"
                    placeholder="e.g. BD Champions Esports"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  WhatsApp Contact Number
                </label>
                <div className="flex items-center rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3 focus-within:border-fuchsia-500 transition-colors">
                  <Phone className="mr-2.5 h-4 w-4 text-fuchsia-400" />
                  <input
                    value={whatsApp}
                    onChange={(e) => setWhatsApp(e.target.value)}
                    className="w-full bg-transparent text-sm font-mono text-white outline-none placeholder-slate-600"
                    placeholder="e.g. +8801700000000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Brand Logo Image URL
                </label>
                <div className="flex items-center rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3 focus-within:border-fuchsia-500 transition-colors">
                  <ImageIcon className="mr-2.5 h-4 w-4 text-fuchsia-400" />
                  <input
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder-slate-600"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Storefront Banner URL
                </label>
                <div className="flex items-center rounded-2xl border border-slate-800 bg-[#07090E] px-4 py-3 focus-within:border-fuchsia-500 transition-colors">
                  <ImageIcon className="mr-2.5 h-4 w-4 text-fuchsia-400" />
                  <input
                    value={banner}
                    onChange={(e) => setBanner(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder-slate-600"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                  Public Organization Bio & Description
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-800 bg-[#07090E] p-4 text-xs text-white outline-none focus:border-fuchsia-500 placeholder-slate-600"
                  placeholder="Tell players about your esports organization, previous tournaments, and community..."
                />
              </div>

            </div>

            {/* Status Messages */}
            {successMessage && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-700 hover:to-violet-700 px-6 py-3.5 font-bold text-white text-xs shadow-lg shadow-fuchsia-950/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>SAVING PROFILE...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>SAVE STOREFRONT PROFILE</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>

    </div>
  );
}

export default function VendorProfilePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-violet-400 font-mono text-xs">LOADING VENDOR PROFILE...</div>}>
      <VendorProfileContent />
    </Suspense>
  );
}
