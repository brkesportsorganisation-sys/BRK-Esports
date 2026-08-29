'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Check, 
  X, 
  Loader2, 
  Zap, 
  ExternalLink 
} from 'lucide-react';
import { compressImageFile, CompressionResult } from '@/lib/image-compressor';

export interface ImageUploadInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  required?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
  presets?: Array<{ label: string; url: string }>;
  helperText?: string;
}

export default function ImageUploadInput({
  value,
  onChange,
  label = 'Image',
  placeholder = 'https://... or upload from device',
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82,
  required = false,
  className = '',
  theme = 'dark',
  presets,
  helperText,
}: ImageUploadInputProps) {
  const [activeMode, setActiveMode] = useState<'UPLOAD' | 'URL'>(value && !value.startsWith('data:') ? 'URL' : 'UPLOAD');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  const handleFileProcess = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose a valid image file (PNG, JPG, JPEG, WEBP, GIF)');
      return;
    }

    setIsCompressing(true);
    try {
      const result = await compressImageFile(file, { maxWidth, maxHeight, quality });
      setCompressionInfo(result);

      // Try to upload to server and get a public HTTPS URL (required for WhatsApp/Green-API)
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json().catch(() => ({}));
          const publicUrl = uploadData?.url || uploadData?.publicUrl || uploadData?.path;
          if (publicUrl && /^https?:\/\//i.test(publicUrl)) {
            onChange(publicUrl);
            return;
          }
        }
      } catch {
        // Upload failed — fall back to base64 dataUrl below
      }

      // Fallback: use base64 dataUrl (works for preview, but NOT for WhatsApp/Green-API)
      onChange(result.dataUrl);
    } catch (err: any) {
      alert(err?.message || 'Failed to compress and load image.');
    } finally {
      setIsCompressing(false);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 text-xs w-full min-w-0 ${className}`}>
      {/* Label and Mode Switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
        <label className={`font-bold flex items-center gap-1.5 min-w-0 truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          <ImageIcon className="w-3.5 h-3.5 text-brand-orange shrink-0" />
          <span className="truncate">{label}</span>
          {required && <span className="text-red-500 shrink-0">*</span>}
        </label>

        {/* Mode Toggle Buttons */}
        <div className={`inline-flex items-center p-0.5 rounded-lg border shrink-0 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setActiveMode('UPLOAD')}
            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              activeMode === 'UPLOAD'
                ? isDark
                  ? 'bg-brand-orange text-white shadow-xs'
                  : 'bg-white text-brand-orange shadow-xs font-black'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3 h-3 shrink-0" />
            <span>Device Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('URL')}
            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              activeMode === 'URL'
                ? isDark
                  ? 'bg-brand-orange text-white shadow-xs'
                  : 'bg-white text-brand-orange shadow-xs font-black'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3 h-3 shrink-0" />
            <span>Image URL</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Device File Upload with Drag & Drop */}
      {activeMode === 'UPLOAD' ? (
        <div className="space-y-2">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-brand-orange bg-brand-orange/10 scale-[1.01]'
                : isDark
                ? 'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-800/60'
                : 'border-slate-300 bg-slate-50 hover:border-brand-orange hover:bg-orange-50/50'
            }`}
          >
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

            {isCompressing ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
                <span className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Auto-compressing image (WebP)...
                </span>
              </div>
            ) : (
              <>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isDark ? 'bg-slate-800 text-brand-orange' : 'bg-orange-100 text-brand-orange'
                }`}>
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Click to browse or drag & drop image
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    PNG, JPG, WEBP • Auto-compressed for maximum speed
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Mode 2: Direct Image URL */
        <div className="space-y-1.5">
          <div className="relative">
            <input
              type="text"
              required={required && !value}
              value={value.startsWith('data:') ? '' : value}
              onChange={(e) => {
                setCompressionInfo(null);
                onChange(e.target.value);
              }}
              placeholder={placeholder}
              className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none transition-all ${
                isDark
                  ? 'bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:border-brand-orange'
                  : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-brand-orange'
              }`}
            />
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-400"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preset Buttons (if available) */}
      {presets && presets.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
          <span className={`text-[10px] font-bold shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Presets:
          </span>
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCompressionInfo(null);
                onChange(preset.url);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] whitespace-nowrap transition-colors border ${
                value === preset.url
                  ? 'bg-brand-orange text-white border-brand-orange font-bold'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Auto-Compression Savings Badge */}
      {compressionInfo && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Compressed: {compressionInfo.originalSizeFormatted} ➔ <strong>{compressionInfo.compressedSizeFormatted}</strong></span>
          </div>
          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-[10px] font-mono font-black">
            -{compressionInfo.savedPercent}% Saved
          </span>
        </div>
      )}

      {/* Image Live Preview */}
      {value && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/80 group">
          <img
            src={value}
            alt="Preview"
            className="w-full h-32 object-cover"
            onError={(e) => {
              // Handle broken URL
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 pointer-events-none" />
          
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> Active Image Preview
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-0.5 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      )}

      {helperText && (
        <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}
