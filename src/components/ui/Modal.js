'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, onClose, title, children, size = 'md', opaque = true }) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Liquid Glass Backdrop */}
      <div
        className="absolute inset-0 glass-modal-backdrop animate-fade-in"
        onClick={onClose}
      />

      {/* HIG Sheet Modal Panel */}
      <div
        ref={modalRef}
        className={`${opaque ? 'bg-[var(--background)] border border-[var(--border)]' : 'glass-modal-panel'} w-full ${sizeClasses[size]} rounded-[28px] overflow-hidden relative z-10 animate-slide-up mx-4 sm:mx-6 flex flex-col`}
        style={{
          boxShadow: 'var(--specular-inner), var(--shadow-xl), 0 24px 64px rgba(0,0,0,0.12)',
          maxHeight: '96vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Chrome styling */}
        <div
          className="flex items-center justify-between px-6 py-4 glass-chrome flex-shrink-0"
          style={{
            borderBottom: '0.5px solid var(--glass-chrome-border)'
          }}
        >
          <h2 className="type-title3 font-bold" style={{ color: 'var(--foreground)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 depth-press"
            style={{
              background: 'var(--muted)',
              color: 'var(--muted-foreground)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
