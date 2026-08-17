'use client';

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Save, 
  Check, 
  Clock, 
  ShieldCheck, 
  Flame, 
  Crosshair, 
  FileText, 
  Sliders,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function TournamentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tournament Configuration States
  const [roomUnlockMinutes, setRoomUnlockMinutes] = useState(15);
  const [minFreeFireLevel, setMinFreeFireLevel] = useState(25);
  const [autoLockSlots, setAutoLockSlots] = useState(true);
  const [requireScreenRecord, setRequireScreenRecord] = useState(true);
  const [defaultGunAttributes, setDefaultGunAttributes] = useState('OFF');
  const [defaultLimitedAmmo, setDefaultLimitedAmmo] = useState('YES');
  const [defaultCharacterSkills, setDefaultCharacterSkills] = useState('YES');
  const [defaultKillBounty, setDefaultKillBounty] = useState(10);
  const [firstPrizeRatio, setFirstPrizeRatio] = useState(50);
  const [secondPrizeRatio, setSecondPrizeRatio] = useState(30);
  const [thirdPrizeRatio, setThirdPrizeRatio] = useState(20);
  const [defaultRulesText, setDefaultRulesText] = useState(`1. All players must join the custom room with their registered in-game name (IGN).
2. Emulators / PC Players are NOT allowed unless the tournament mode specifically allows PC.
3. Gun Attributes: OFF | Character Skills: YES | Gun Property: Standard.
4. Any form of hacking, script injection, or teaming with other squads will result in an immediate permanent ban and forfeiture of all wallet funds.
5. In case of any dispute, the Captain must submit the end-match scoreboard screenshot within 15 minutes.`);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};
          if (s.room_unlock_minutes) setRoomUnlockMinutes(Number(s.room_unlock_minutes));
          if (s.min_ff_level) setMinFreeFireLevel(Number(s.min_ff_level));
          if (s.default_rules_text) setDefaultRulesText(s.default_rules_text);
          if (s.default_kill_bounty) setDefaultKillBounty(Number(s.default_kill_bounty));
          if (s.gun_attributes) setDefaultGunAttributes(s.gun_attributes);
        }
      } catch (err) {
        console.warn('Failed to load tournament settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        room_unlock_minutes: String(roomUnlockMinutes),
        min_ff_level: String(minFreeFireLevel),
        default_rules_text: defaultRulesText,
        default_kill_bounty: String(defaultKillBounty),
        gun_attributes: defaultGunAttributes,
        auto_lock_slots: autoLockSlots ? 'true' : 'false',
        require_screen_record: requireScreenRecord ? 'true' : 'false',
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert('Failed to save tournament settings.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-pink-500" />
              Tournament Engine & Match Rules
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure automated room ID timings, Free Fire match properties, prize split defaults, and official tournament rules.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-pink-500/20 flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Tournament Rules
          </button>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-bold flex items-center gap-2 shadow-sm">
            <Check className="w-4 h-4" />
            Tournament rules and match configuration saved successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Room Automation & Timing */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Custom Room Automation & Timers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Room ID Unlock Timing</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={roomUnlockMinutes}
                    onChange={(e) => setRoomUnlockMinutes(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                  />
                  <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Minutes before match</span>
                </div>
                <p className="text-[10px] text-slate-400">Registered players can only see Room ID & Password at this time.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Minimum Free Fire Account Level</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={minFreeFireLevel}
                  onChange={(e) => setMinFreeFireLevel(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                />
                <p className="text-[10px] text-slate-400">Prevents newly created throwaway / hacker accounts from registering.</p>
              </div>
            </div>
          </div>

          {/* Free Fire Custom Room Defaults */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-pink-500" />
              Standard Free Fire In-Game Settings Presets
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Gun Attributes</label>
                <select
                  value={defaultGunAttributes}
                  onChange={(e) => setDefaultGunAttributes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                >
                  <option value="OFF">OFF (Fair Competitive Esports Standard)</option>
                  <option value="ON">ON (Gun Skins Active)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Limited Ammo</label>
                <select
                  value={defaultLimitedAmmo}
                  onChange={(e) => setDefaultLimitedAmmo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                >
                  <option value="YES">YES (Standard Battle Royale)</option>
                  <option value="NO">NO (Unlimited Gloo Wall / Ammo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Character Skills</label>
                <select
                  value={defaultCharacterSkills}
                  onChange={(e) => setDefaultCharacterSkills(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                >
                  <option value="YES">YES (Skills Active - Alok, Chrono, etc.)</option>
                  <option value="NO">NO (No Skills - Raw Gun Skill)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Prize Split Defaults */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              Default Prize Pool Split Ratio (%)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">1st Place (Booyah)</label>
                <input
                  type="number"
                  value={firstPrizeRatio}
                  onChange={(e) => setFirstPrizeRatio(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                />
                <span className="text-[10px] text-slate-400">% of main pool</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">2nd Place (Runner-Up)</label>
                <input
                  type="number"
                  value={secondPrizeRatio}
                  onChange={(e) => setSecondPrizeRatio(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                />
                <span className="text-[10px] text-slate-400">% of main pool</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">3rd Place</label>
                <input
                  type="number"
                  value={thirdPrizeRatio}
                  onChange={(e) => setThirdPrizeRatio(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                />
                <span className="text-[10px] text-slate-400">% of main pool</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Per Kill Bounty</label>
                <input
                  type="number"
                  value={defaultKillBounty}
                  onChange={(e) => setDefaultKillBounty(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500"
                />
                <span className="text-[10px] text-slate-400">৳ BDT per kill</span>
              </div>
            </div>
          </div>

          {/* Official Rules Template */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              Official Tournament Rules Template
            </h3>
            <p className="text-xs text-slate-500">
              This text is automatically attached as the default rules markdown when creating any new Free Fire tournament.
            </p>

            <textarea
              rows={6}
              value={defaultRulesText}
              onChange={(e) => setDefaultRulesText(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:border-pink-500 bg-slate-50"
            />
          </div>

        </form>

      </div>
  );
}
