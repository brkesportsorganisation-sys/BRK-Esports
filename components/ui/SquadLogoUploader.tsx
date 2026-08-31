'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Camera, 
  Image as ImageIcon, 
  Check, 
  X, 
  Loader2, 
  Zap, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { compressImageFile, CompressionResult } from '@/lib/image-compressor';

export interface SquadLogoUploaderProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
  squadTag?: string;
  squadName?: string;
}

export default function SquadLogoUploader({
  value,
  onChange,
  label = 'Squad Logo / Clan Badge',
  required = true,
  className = '',
  theme = 'light',
  squadTag,
  squadName,
}: SquadLogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  const handleFileProcess = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image (PNG, JPG, JPEG, WEBP).');
      return;
    }

    setErrorMessage('');
    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // 1. Client-side auto compression for fast mobile loading
      const result = await compressImageFile(file, { 
        maxWidth: 800, 
        maxHeight: 800, 
        quality: 0.85 
      });
      setCompressionInfo(result);

      // 2. Upload to Supabase Storage via /api/upload
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'squad-logos');

        const uploadRes = await fetch('/api/upload?folder=squad-logos', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}));
          const publicUrl = uploadData?.url || uploadData?.publicUrl || uploadData?.path;
          if (publicUrl && /^https?:\/\//i.test(publicUrl)) {
            onChange(publicUrl);
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 3000);
            return;
          }
        }
      } catch (uploadErr) {
        console.warn('[SquadLogoUploader] Direct server upload notice, using compressed fallback:', uploadErr);
      }

      // Fallback: Use high-quality compressed Base64 Data URL (the backend will automatically upload and store in Supabase storage & DB on save)
      onChange(result.dataUrl);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    onChange('');
    setCompressionInfo(null);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2.5 text-xs w-full min-w-0 ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between gap-2">
        <label className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          <ImageIcon className="w-4 h-4 text-brand-orange shrink-0" />
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        
        {value && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Change Photo</span>
          </button>
        )}
      </div>

      {/* Hidden File Input for Mobile & Desktop */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            void handleFileProcess(e.target.files[0]);
          }
        }}
      />

      {/* Main Upload Box / Preview Card */}
      {!value ? (
        /* Empty State: Tap to Upload from Mobile */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 group ${
            isDragging
              ? 'border-brand-orange bg-orange-50 scale-[1.01]'
              : isDark
              ? 'border-slate-700 bg-slate-900/70 hover:border-brand-orange hover:bg-slate-800/80'
              : 'border-orange-300/80 bg-orange-50/40 hover:border-brand-orange hover:bg-orange-50'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                Uploading & compressing logo...
              </span>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-red text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <div className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  📱 Tap here to upload squad logo from phone / device
                </div>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Gallery, Files or Camera • PNG, JPG, WEBP
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Filled State: Active Logo Preview with Badge & Details */
        <div className={`rounded-2xl border p-4 relative overflow-hidden flex flex-col sm:flex-row items-center gap-4 ${
          isDark 
            ? 'bg-slate-900/90 border-slate-700' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Logo Thumbnail with Camera Overlay */}
          <div className="relative group shrink-0">
            <img
              src={value}
              alt="Squad Logo"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-brand-orange shadow-md bg-slate-900"
              onError={(e) => {
                // Fallback on broken image
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold gap-1"
              title="Change squad logo"
            >
              <Camera className="w-5 h-5" />
              <span>Change</span>
            </button>
          </div>

          {/* Logo Details & Preview Info */}
          <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Logo Uploaded & Ready</span>
              </span>
              {squadTag && (
                <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-mono font-black text-[10px]">
                  [{squadTag.toUpperCase()}]
                </span>
              )}
            </div>

            <div className={`font-black text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {squadName || 'Your Esports Squad'}
            </div>

            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              This logo will be saved to your database and displayed in tournaments, rosters & leaderboard.
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-orange border border-orange-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                <span>Upload New Logo</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs font-medium transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {uploadSuccess && (
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Squad logo successfully processed!</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
