'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';

// ── Icons ────────────────────────────────────────────────────
const icons = {
  search: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  recent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  // Category icons
  subject: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  course: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  unit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  question: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  page: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
};

// ── Static Pages (sidebar tabs) ──────────────────────────────
const PAGES = [
  { label: 'Home', href: '/', keywords: ['home', 'dashboard'] },
  { label: 'Friends', href: '/friends', keywords: ['friends', 'study groups', 'social'] },
  { label: 'Notifications', href: '/inbox', keywords: ['notifications', 'inbox', 'messages'] },
  { label: 'Your Classes', href: '/subjects', keywords: ['classes', 'subjects', 'library'] },
  { label: 'Generate', href: '/generate', keywords: ['generate', 'ai', 'create', 'flashcards'] },
  { label: 'Review', href: '/review', keywords: ['review', 'study', 'questions'] },
  { label: 'Progress', href: '/progress', keywords: ['progress', 'stats', 'analytics'] },
  { label: 'Leaderboard', href: '/leaderboard', keywords: ['leaderboard', 'ranking', 'compete'] },
  { label: 'Calendar', href: '/calendar', keywords: ['calendar', 'schedule', 'dates'] },
  { label: 'Settings', href: '/settings', keywords: ['settings', 'preferences', 'account'] },
];

const RECENT_SEARCHES_KEY = 'quizzard-recent-searches';
const MAX_RECENT = 5;

// ── Component ────────────────────────────────────────────────
export default function SearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ pages: [], subjects: [], courses: [], units: [], questions: [] });
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);
  const router = useRouter();
  const supabase = createClient();

  // Mount check for portal
  useEffect(() => { setMounted(true); }, []);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      setRecentSearches(stored);
    } catch { /* ignore */ }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ pages: [], subjects: [], courses: [], units: [], questions: [] });
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Save a recent search
  const saveRecent = useCallback((term, href) => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      const updated = [{ term, href }, ...stored.filter(r => r.href !== href)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch { /* ignore */ }
  }, []);

  // Flatten results for keyboard navigation
  const flatResults = [
    ...results.pages.map(r => ({ ...r, category: 'Pages' })),
    ...results.subjects.map(r => ({ ...r, category: 'Subjects' })),
    ...results.courses.map(r => ({ ...r, category: 'Courses' })),
    ...results.units.map(r => ({ ...r, category: 'Units' })),
    ...results.questions.map(r => ({ ...r, category: 'Questions' })),
  ];

  // ── Search Logic ───────────────────────────────────────────
  const performSearch = useCallback(async (searchQuery) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setResults({ pages: [], subjects: [], courses: [], units: [], questions: [] });
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Pages — client-side filter
    const matchedPages = PAGES.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.keywords.some(k => k.includes(q))
    ).map(p => ({
      title: p.label,
      subtitle: p.href,
      href: p.href,
      icon: icons.page,
    }));

    // 2. Supabase queries in parallel
    try {
      const [subjectsRes, coursesRes, unitsRes, questionsRes] = await Promise.all([
        supabase
          .from('subjects')
          .select('id, name, color, icon')
          .ilike('name', `%${q}%`)
          .limit(5),
        supabase
          .from('courses')
          .select('id, name, course_code, subject_id, subjects(name)')
          .or(`name.ilike.%${q}%,course_code.ilike.%${q}%`)
          .limit(5),
        supabase
          .from('units')
          .select('id, title, course_id, courses(id, name, course_code, subject_id)')
          .ilike('title', `%${q}%`)
          .limit(5),
        supabase
          .from('questions')
          .select('id, question_text, type, unit_id, units(title, course_id)')
          .ilike('question_text', `%${q}%`)
          .limit(5),
      ]);

      const subjects = (subjectsRes.data || []).map(s => ({
        title: s.name,
        subtitle: s.icon || '📚',
        href: `/subjects`,
        icon: icons.subject,
        color: s.color,
      }));

      const courses = (coursesRes.data || []).map(c => ({
        title: c.course_code || c.name,
        subtitle: c.subjects?.name || c.name,
        href: `/subjects/${c.subject_id}/courses/${c.id}`,
        icon: icons.course,
      }));

      const units = (unitsRes.data || []).map(u => ({
        title: u.title,
        subtitle: u.courses?.course_code || u.courses?.name || '',
        href: `/subjects/${u.courses?.subject_id}/courses/${u.course_id}/units/${u.id}`,
        icon: icons.unit,
      }));

      const questions = (questionsRes.data || []).map(q => ({
        title: q.question_text.length > 80 ? q.question_text.slice(0, 80) + '…' : q.question_text,
        subtitle: q.units?.title || q.type,
        href: '/review',
        icon: icons.question,
      }));

      setResults({
        pages: matchedPages,
        subjects,
        courses,
        units,
        questions,
      });

      setActiveIndex(0);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults({ pages: [], subjects: [], courses: [], units: [], questions: [] });
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, performSearch]);

  // ── Navigation ─────────────────────────────────────────────
  const navigateTo = useCallback((item) => {
    saveRecent(item.title, item.href);
    onClose();
    router.push(item.href);
  }, [router, onClose, saveRecent]);

  // Keyboard handler
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatResults[activeIndex]) {
      e.preventDefault();
      navigateTo(flatResults[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!isOpen || !mounted) return null;

  // ── Render helpers ─────────────────────────────────────────
  const renderCategory = (label, items, startIdx) => {
    if (items.length === 0) return null;
    return (
      <div key={label} className="search-result-category">
        <div
          className="px-4 py-2 type-caption2 font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {label}
        </div>
        {items.map((item, i) => {
          const globalIdx = startIdx + i;
          const isActive = globalIdx === activeIndex;
          return (
            <button
              key={`${label}-${i}`}
              data-active={isActive}
              className="search-result-item w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 cursor-pointer"
              style={{
                background: isActive ? 'var(--glass-regular-bg)' : 'transparent',
                borderRadius: '14px',
                margin: '0 8px',
                width: 'calc(100% - 16px)',
              }}
              onClick={() => navigateTo(item)}
              onMouseEnter={() => setActiveIndex(globalIdx)}
            >
              <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: item.color
                    ? `color-mix(in srgb, ${item.color} 15%, transparent)`
                    : 'var(--glass-ultra-thin-bg)',
                  color: item.color || 'var(--muted-foreground)',
                  border: `0.5px solid ${item.color ? `color-mix(in srgb, ${item.color} 25%, transparent)` : 'var(--glass-ultra-thin-border)'}`,
                }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="type-subhead font-medium truncate"
                  style={{ color: 'var(--foreground)' }}
                >
                  {item.title}
                </p>
                {item.subtitle && (
                  <p
                    className="type-caption1 truncate mt-0.5"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {item.subtitle}
                  </p>
                )}
              </div>
              <span
                className="flex-shrink-0 transition-opacity duration-150"
                style={{
                  color: 'var(--muted-foreground)',
                  opacity: isActive ? 1 : 0,
                }}
              >
                {icons.arrow}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // Compute start indices for each category
  let idx = 0;
  const categoryData = [
    { label: 'Pages', items: results.pages },
    { label: 'Subjects', items: results.subjects },
    { label: 'Courses', items: results.courses },
    { label: 'Units', items: results.units },
    { label: 'Questions', items: results.questions },
  ];

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 search-modal-backdrop animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="search-modal-panel relative z-10 w-full max-w-xl mx-4 rounded-[24px] overflow-hidden animate-search-slide-down"
        style={{
          background: 'var(--glass-thick-bg)',
          backdropFilter: 'var(--glass-thick-blur)',
          WebkitBackdropFilter: 'var(--glass-thick-blur)',
          border: '0.5px solid var(--glass-thick-border)',
          boxShadow: 'var(--specular-inner), var(--shadow-xl), 0 24px 80px rgba(0,0,0,0.18)',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '0.5px solid var(--glass-regular-border)' }}
        >
          <span style={{ color: 'var(--muted-foreground)' }}>{icons.search}</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search classes, quizzes, questions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none type-body"
            style={{ color: 'var(--foreground)' }}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {icons.close}
            </button>
          )}
          <kbd
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg type-caption2 font-medium flex-shrink-0"
            style={{
              background: 'var(--glass-ultra-thin-bg)',
              border: '0.5px solid var(--glass-ultra-thin-border)',
              color: 'var(--muted-foreground)',
            }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1 py-2" style={{ scrollbarWidth: 'thin' }}>
          {loading && query.trim() && (
            <div className="flex items-center justify-center py-8">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {!loading && query.trim() && flatResults.length === 0 && (
            <div className="py-10 text-center">
              <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>
                No results found for "<strong style={{ color: 'var(--foreground)' }}>{query}</strong>"
              </p>
              <p className="type-caption1 mt-2" style={{ color: 'var(--muted-foreground)' }}>
                Try searching for a subject, course, or question
              </p>
            </div>
          )}

          {!loading && query.trim() && flatResults.length > 0 && (
            <>
              {categoryData.map(({ label, items }) => {
                const startIdx = idx;
                idx += items.length;
                return renderCategory(label, items, startIdx);
              })}
            </>
          )}

          {/* Empty state — recent searches */}
          {!query.trim() && (
            <div className="py-2">
              {recentSearches.length > 0 && (
                <div>
                  <div
                    className="px-4 py-2 type-caption2 font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Recent
                  </div>
                  {recentSearches.map((item, i) => (
                    <button
                      key={i}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 cursor-pointer"
                      style={{
                        borderRadius: '14px',
                        margin: '0 8px',
                        width: 'calc(100% - 16px)',
                      }}
                      onClick={() => {
                        onClose();
                        router.push(item.href);
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-regular-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ color: 'var(--muted-foreground)' }}>{icons.recent}</span>
                      <span className="type-subhead truncate" style={{ color: 'var(--foreground)' }}>
                        {item.term}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick jump pages */}
              <div>
                <div
                  className="px-4 py-2 type-caption2 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Quick Jump
                </div>
                {PAGES.slice(0, 6).map((page, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 cursor-pointer"
                    style={{
                      borderRadius: '14px',
                      margin: '0 8px',
                      width: 'calc(100% - 16px)',
                    }}
                    onClick={() => {
                      saveRecent(page.label, page.href);
                      onClose();
                      router.push(page.href);
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--glass-regular-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'var(--glass-ultra-thin-bg)',
                        border: '0.5px solid var(--glass-ultra-thin-border)',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      {icons.page}
                    </div>
                    <span className="type-subhead font-medium" style={{ color: 'var(--foreground)' }}>
                      {page.label}
                    </span>
                    <span className="ml-auto type-caption1" style={{ color: 'var(--muted-foreground)' }}>
                      {page.href}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-5 py-2.5 flex-shrink-0 type-caption2"
          style={{
            borderTop: '0.5px solid var(--glass-regular-border)',
            color: 'var(--muted-foreground)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md" style={{ background: 'var(--glass-ultra-thin-bg)', border: '0.5px solid var(--glass-ultra-thin-border)' }}>↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded-md" style={{ background: 'var(--glass-ultra-thin-bg)', border: '0.5px solid var(--glass-ultra-thin-border)' }}>↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md" style={{ background: 'var(--glass-ultra-thin-bg)', border: '0.5px solid var(--glass-ultra-thin-border)' }}>↵</kbd>
              open
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded-md" style={{ background: 'var(--glass-ultra-thin-bg)', border: '0.5px solid var(--glass-ultra-thin-border)' }}>esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
