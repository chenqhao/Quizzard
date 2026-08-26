'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';

/**
 * Reusable image upload component with preview, drag-and-drop, and remove.
 * 
 * Props:
 *   imageUrl     - current image URL (or null)
 *   onUpload     - callback(url) when upload succeeds
 *   onRemove     - callback() when user removes the image
 *   label        - optional label text (default: "Add Image")
 *   compact      - if true, renders a smaller inline version for answer choices
 *   bucket       - Supabase Storage bucket name (default: "question-images")
 *   maxSizeMB    - max file size in MB (default: 5)
 */
export default function ImageUpload({
  imageUrl,
  onUpload,
  onRemove,
  label = 'Add Image',
  compact = false,
  bucket = 'question-images',
  maxSizeMB = 5,
}) {
  const supabase = createClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;

    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be under ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onUpload(publicUrl);
    } catch (err) {
      console.error('Image upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    handleFile(e.target.files?.[0]);
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  // --- Compact mode (inline, for answer choices) ---
  if (compact) {
    if (imageUrl) {
      return (
        <div className="relative group inline-block">
          <img
            src={imageUrl}
            alt="Answer"
            className="w-16 h-16 object-cover rounded-lg border"
            style={{ borderColor: 'var(--border)' }}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            ×
          </button>
        </div>
      );
    }

    return (
      <div className="inline-block">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          disabled={uploading}
          className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-all hover:border-[var(--primary)]"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
          title={label}
        >
          {uploading ? (
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          )}
        </button>
        {error && <p className="text-[10px] mt-1" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }

  // --- Full mode (for question image) ---
  if (imageUrl) {
    return (
      <div className="space-y-2">
        {label && <label className="block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{label}</label>}
        <div className="relative group rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <img
            src={imageUrl}
            alt="Question"
            className="w-full max-h-64 object-contain bg-[var(--muted)]"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--card)', color: 'var(--foreground)' }}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--danger)', color: '#fff' }}
            >
              Remove
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{label}</label>}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? 'var(--primary)' : 'var(--border)',
          background: dragOver ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'var(--muted)',
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Uploading...</span>
          </div>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }}>
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              Drop an image here or <span style={{ color: 'var(--primary)' }}>click to browse</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
              PNG, JPG, GIF up to {maxSizeMB}MB
            </p>
          </>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
