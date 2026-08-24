'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import { ICONS, renderIcon } from '@/lib/icons';

const COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

// SVG icon components — SF Symbols Medium weight (1.5px stroke)
const icons = {
  menu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  library: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  studyGroups: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  notifications: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  plus: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  flashcards: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="16" height="14" rx="2" />
      <path d="M6 2v2" />
      <path d="M22 8v10a2 2 0 0 1-2 2H8" />
    </svg>
  ),
  studyGuides: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  leaderboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 19.24 7 20h10c0-.76-.85-1.25-2.03-1.79C14.47 17.98 14 17.55 14 17v-2.34" />
      <path d="M18 7.5C18 12 12 17 12 17s-6-5-6-9.5a6 6 0 0 1 12 0" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  progress: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  review: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  dot: (
    <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
      <circle cx="3" cy="3" r="3" />
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
};

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', color: COLORS[0], icon: ICONS[0] });
  const [savingClass, setSavingClass] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    loadSubjects();
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { count } = await supabase
        .from('quiz_mail')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      setUnreadCount(count || 0);
    } catch (e) {
      // quiz_mail table may not exist yet
    }
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select(`
        id, name, icon, color,
        courses (id, name, course_code,
          units (id, title)
        )
      `)
      .order('created_at', { ascending: true });
    setSubjects(data || []);
  };

  // Listen for custom events to refresh sidebar
  useEffect(() => {
    const handler = () => loadSubjects();
    window.addEventListener('sidebar-refresh', handler);
    return () => window.removeEventListener('sidebar-refresh', handler);
  }, []);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (path) => pathname === path;

  const openAddClass = () => {
    setClassForm({ name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], icon: ICONS[0] });
    setAddClassOpen(true);
  };

  const handleSaveClass = async () => {
    if (!classForm.name.trim()) return;
    setSavingClass(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await supabase.from('subjects').insert({
      name: classForm.name.trim(),
      color: classForm.color,
      icon: classForm.icon,
      user_id: authUser.id,
    });
    setSavingClass(false);
    setAddClassOpen(false);
    loadSubjects();
    window.dispatchEvent(new Event('sidebar-refresh'));
  };

  // Main navigation items
  const mainNav = [
    { href: '/', icon: icons.home, label: 'Home' },
    { href: '/friends', icon: icons.studyGroups, label: 'Friends' },
    { href: '/inbox', icon: icons.notifications, label: 'Notifications', badge: unreadCount },
  ];

  // Quick access items
  const quickAccess = [
    { href: '/generate', icon: icons.flashcards, label: 'Generate' },
    { href: '/review', icon: icons.review, label: 'Review' },
    { href: '/progress', icon: icons.progress, label: 'Progress' },
    { href: '/leaderboard', icon: icons.leaderboard, label: 'Leaderboard' },
    { href: '/calendar', icon: icons.calendar, label: 'Calendar' },
  ];

  const sidebarWidth = collapsed ? 68 : 244;

  return (
    <>
    <aside
      className="sidebar-container"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), min-width 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
        overflow: 'hidden',
        zIndex: 30,
      }}
    >
      {/* Top: Hamburger */}
      <div
        className="flex items-center gap-2 px-3 py-3"
        style={{
          height: 'var(--topbar-height)',
          borderBottom: '0.5px solid var(--sidebar-border)',
        }}
      >
        <button
          onClick={toggleCollapsed}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 depth-press"
          style={{
            color: 'var(--sidebar-foreground)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--sidebar-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {icons.menu}
        </button>
      </div>

      {/* Scrollable nav area */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3" style={{ scrollbarWidth: 'thin' }}>
        {/* Main nav section */}
        <div className="px-2.5 space-y-0.5">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer relative depth-press ${isActive(item.href) ? 'sidebar-nav-active' : ''}`}
              style={{
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: isActive(item.href) ? 'var(--primary)' : 'var(--sidebar-foreground)',
              }}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0" style={{ opacity: isActive(item.href) ? 1 : 0.65 }}>
                {item.icon}
              </span>
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {item.badge > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold badge-pulse"
                  style={{
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    position: collapsed ? 'absolute' : 'static',
                    top: collapsed ? '4px' : undefined,
                    right: collapsed ? '4px' : undefined,
                    fontSize: collapsed ? '9px' : undefined,
                    minWidth: collapsed ? '14px' : undefined,
                    height: collapsed ? '14px' : undefined,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Divider — subtle separator */}
        <div className="mx-4 my-3" style={{ borderTop: '0.5px solid var(--sidebar-border)' }} />

        {/* Your classes section header — HIG caption2 */}
        {!collapsed && (
          <div className="px-4 mb-2">
            <p className="type-caption2" style={{ color: 'var(--muted-foreground)' }}>
              Your classes
            </p>
          </div>
        )}

        <div className="px-2.5 space-y-0.5">
          {/* Classes link */}
          <Link
            href="/subjects"
            className={`sidebar-nav-item flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer depth-press ${isActive('/subjects') ? 'sidebar-nav-active' : ''}`}
            style={{
              padding: collapsed ? '10px 0' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: isActive('/subjects') ? 'var(--primary)' : 'var(--sidebar-foreground)',
            }}
            title={collapsed ? 'Your classes' : undefined}
          >
            <span className="flex-shrink-0" style={{ opacity: isActive('/subjects') ? 1 : 0.65 }}>
              {icons.library}
            </span>
            {!collapsed && <span className="flex-1 truncate">Your classes</span>}
          </Link>

          {/* Subject list (classes) */}
          {!collapsed && subjects.map((subject) => (
            <div key={subject.id} className="mb-0.5">
              <button
                onClick={() => toggleExpand(subject.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-300 cursor-pointer depth-press"
                style={{ color: 'var(--sidebar-foreground)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--sidebar-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background: subject.color || 'var(--primary)',
                    boxShadow: `0 0 6px ${subject.color || 'var(--primary)'}40`,
                  }}
                />
                <span className="truncate flex-1 text-left font-medium">{subject.name}</span>
                <span className={`transition-transform duration-300 flex-shrink-0 ${expanded[subject.id] ? 'rotate-90' : ''}`} style={{ color: 'var(--muted-foreground)' }}>
                  {icons.chevron}
                </span>
              </button>

              {expanded[subject.id] && subject.courses?.map((course) => (
                <div key={course.id} className="ml-4">
                  <Link
                    href={`/subjects/${subject.id}/courses/${course.id}`}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200 cursor-pointer"
                    style={{
                      color: pathname.includes(course.id)
                        ? 'var(--primary)'
                        : 'var(--muted-foreground)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--sidebar-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ color: subject.color || 'var(--primary)', opacity: 0.5 }}>{icons.dot}</span>
                    <span className="truncate">{course.course_code || course.name}</span>
                  </Link>
                  {pathname.includes(course.id) && course.units?.map((unit) => (
                    <Link
                      key={unit.id}
                      href={`/subjects/${subject.id}/courses/${course.id}/units/${unit.id}`}
                      className="flex items-center gap-2 ml-5 px-3 py-1 rounded-xl text-xs transition-all duration-200 cursor-pointer"
                      style={{
                        color: pathname.includes(unit.id)
                          ? 'var(--primary)'
                          : 'var(--muted-foreground)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--sidebar-accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span className="w-1 h-1 rounded-full" style={{ background: 'var(--muted-foreground)', opacity: 0.5 }} />
                      <span className="truncate">{unit.title}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Quick add class button */}
        <div className="px-2.5 mt-1">
          <button
            onClick={openAddClass}
            id="sidebar-add-class-btn"
            className="w-full sidebar-nav-item flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer depth-press group"
            style={{
              padding: collapsed ? '10px 0' : '8px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: 'var(--muted-foreground)',
              background: 'transparent',
              border: 'none',
            }}
            title={collapsed ? 'Add Class' : undefined}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                color: 'var(--primary)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            {!collapsed && <span className="truncate transition-colors duration-200 group-hover:text-[var(--primary)]">Add Class</span>}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 my-3" style={{ borderTop: '0.5px solid var(--sidebar-border)' }} />

        {/* Quick Access section header — HIG caption2 */}
        {!collapsed && (
          <div className="px-4 mb-2">
            <p className="type-caption2" style={{ color: 'var(--muted-foreground)' }}>
              Quick Access
            </p>
          </div>
        )}

        <div className="px-2.5 space-y-0.5">
          {quickAccess.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer depth-press ${isActive(item.href) ? 'sidebar-nav-active' : ''}`}
              style={{
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: isActive(item.href) ? 'var(--primary)' : 'var(--sidebar-foreground)',
              }}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0" style={{ opacity: isActive(item.href) ? 1 : 0.65 }}>
                {item.icon}
              </span>
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3" style={{ borderTop: '0.5px solid var(--sidebar-border)' }}>
        {!collapsed ? (
          <p className="text-xs px-1 font-medium" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.02em' }}>
            Quizzard
          </p>
        ) : (
          <div className="flex justify-center">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--primary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </aside>

    {/* Add Class Modal */}
    <Modal isOpen={addClassOpen} onClose={() => setAddClassOpen(false)} title="New Subject" opaque={true}>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Subject Name</label>
          <input
            id="sidebar-subject-name-input"
            value={classForm.name}
            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && classForm.name.trim() && handleSaveClass()}
            placeholder="e.g., Mathematics"
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
            style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setClassForm({ ...classForm, icon })}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all border"
                style={{
                  borderColor: classForm.icon === icon ? 'var(--primary)' : 'var(--border)',
                  background: classForm.icon === icon ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--muted)',
                }}
              >
                {renderIcon(icon)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setClassForm({ ...classForm, color })}
                className="w-8 h-8 rounded-full transition-all"
                style={{
                  background: color,
                  boxShadow: classForm.color === color ? `0 0 0 3px var(--background), 0 0 0 5px ${color}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => setAddClassOpen(false)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Cancel
          </button>
          <button
            id="sidebar-save-subject-btn"
            onClick={handleSaveClass}
            disabled={savingClass || !classForm.name.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift disabled:opacity-50"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {savingClass ? 'Saving...' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
    </>
  );
}
