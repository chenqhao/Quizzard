'use client';

import Link from 'next/link';

export default function Breadcrumb({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 type-footnote">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-1" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
              
              {isLast || !item.href ? (
                <span className="font-medium truncate max-w-[200px]" style={{ color: 'var(--foreground)' }}>
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="transition-colors duration-200 truncate max-w-[120px]"
                  style={{ color: 'var(--muted-foreground)' }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--foreground)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--muted-foreground)'}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
