import React from 'react';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      {/* HIG Liquid Glass Circle Icon Container */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: 'var(--glass-ultra-thin-bg)',
          backdropFilter: 'var(--glass-ultra-thin-blur)',
          border: '0.5px solid var(--glass-ultra-thin-border)',
          boxShadow: 'var(--specular-inner), 0 8px 32px rgba(0,0,0,0.06)',
          color: 'var(--primary)',
        }}
      >
        <div style={{ transform: 'scale(1.5)' }}>
          {icon}
        </div>
      </div>

      <h3 className="type-title3 font-bold mb-2" style={{ color: 'var(--foreground)' }}>
        {title}
      </h3>

      <p className="type-callout max-w-md mx-auto mb-8" style={{ color: 'var(--muted-foreground)' }}>
        {description}
      </p>

      {action && (
        <div className="flex justify-center w-full">
          {action}
        </div>
      )}
    </div>
  );
}
