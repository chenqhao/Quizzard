'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SearchModal from '@/components/SearchModal';

// SVG icon components — SF Symbols Medium weight (1.5px stroke)
const icons = {
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  lightning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  moon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  sun: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  user: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
};

export default function TopBar({ user }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isDark, setIsDark] = useState(false);
  const [dynamicTitle, setDynamicTitle] = useState('Home');

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    const fetchTitle = async () => {
      if (pathname === '/') {
        setDynamicTitle('Home');
      } else if (pathname === '/generate') {
        setDynamicTitle('Generate');
      } else if (pathname.includes('/subjects')) {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 2 && segments[0] === 'subjects') {
          const { data } = await supabase.from('subjects').select('name').eq('id', segments[1]).single();
          setDynamicTitle(data ? data.name : 'Subject');
        } else if (segments.length === 4 && segments[2] === 'courses') {
          const { data } = await supabase.from('courses').select('course_code, name').eq('id', segments[3]).single();
          setDynamicTitle(data ? (data.course_code || data.name) : 'Course');
        } else if (segments.length === 6 && segments[4] === 'units') {
          const { data } = await supabase.from('units').select('title').eq('id', segments[5]).single();
          setDynamicTitle(data ? data.title : 'Unit');
        } else {
          setDynamicTitle('Subjects');
        }
      } else {
        const segment = pathname.split('/')[1];
        if (segment) {
          setDynamicTitle(segment.charAt(0).toUpperCase() + segment.slice(1));
        }
      }
    };

    fetchTitle();
  }, [pathname, supabase]);


  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="glass-chrome sticky top-0 z-20 flex items-center justify-between px-5 py-3 transition-all duration-300"
      style={{
        height: 'var(--topbar-height)',
        borderBottom: '0.5px solid var(--glass-chrome-border)'
      }}
    >
      <div className="flex items-center gap-4 flex-1">
        <h1 className="type-headline" style={{ color: 'var(--foreground)' }}>
          {dynamicTitle}
        </h1>

        <div className="hidden md:flex items-center">
          <Breadcrumb />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Search — glass icon button */}
        <button
          onClick={() => setSearchOpen(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer depth-press"
          style={{
            background: 'var(--glass-ultra-thin-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '0.5px solid var(--glass-ultra-thin-border)',
            color: 'var(--muted-foreground)',
          }}
          title="Search (⌘K)"
        >
          {icons.search}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-9 h-9 rounded-full overflow-hidden transition-all duration-300 depth-press glass flex items-center justify-center hover-lift"
            style={{
              padding: '2px',
            }}
          >
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                {user?.user_metadata?.full_name?.[0]?.toUpperCase() || icons.user}
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl animate-scale-in origin-top-right overflow-hidden"
              style={{
                background: 'var(--glass-thick-bg)',
                backdropFilter: 'var(--glass-thick-blur)',
                WebkitBackdropFilter: 'var(--glass-thick-blur)',
                border: '0.5px solid var(--glass-thick-border)',
                boxShadow: 'var(--specular-inner), var(--shadow-xl)',
                zIndex: 50,
              }}
            >
              {/* User Info Header */}
              <div className="px-4 py-3" style={{ borderBottom: '0.5px solid var(--glass-regular-border)', background: 'var(--glass-ultra-thin-bg)' }}>
                <p className="type-footnote font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                  {user?.email}
                </p>
              </div>

              {/* Menu Items */}
              <div className="p-1.5 space-y-0.5">
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 cursor-pointer depth-press"
                  onClick={() => setDropdownOpen(false)}
                  style={{ color: 'var(--foreground)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--muted)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ color: 'var(--muted-foreground)' }}>{icons.settings}</span>
                  Settings
                </Link>

                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 cursor-pointer depth-press"
                  style={{ color: 'var(--foreground)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--muted)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ color: 'var(--muted-foreground)' }}>
                    {isDark ? icons.sun : icons.moon}
                  </span>
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>

              <div className="p-1.5" style={{ borderTop: '0.5px solid var(--glass-regular-border)' }}>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer depth-press"
                  style={{ color: 'var(--danger)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 15%, transparent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ opacity: 0.8 }}>{icons.logout}</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
