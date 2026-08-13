'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Target } from '@phosphor-icons/react/dist/ssr/Target';
import { BookOpen } from '@phosphor-icons/react/dist/ssr/BookOpen';

// ── helpers ──────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function startDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isSameDay(a, b) {
  return a === b; // compare YYYY-MM-DD strings
}
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

const EVENT_TYPES = [
  { value: 'exam', label: 'Exam', icon: <Target weight="fill" size={16} /> },
  { value: 'study', label: 'Study Session', icon: <BookOpen weight="fill" size={16} /> },
];

const EVENT_COLORS = [
  '#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
];

// ── component ────────────────────────────────────────────────
export default function CalendarPage() {
  const supabase = createClient();

  const today = new Date();
  const todayStr = toDateStr(today);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({
    title: '',
    event_type: 'exam',
    event_date: todayStr,
    start_time: '',
    end_time: '',
    course_id: '',
    notes: '',
    color: EVENT_COLORS[0],
  });
  const [saving, setSaving] = useState(false);

  // ── data loading ─────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [currentYear, currentMonth]);

  const loadData = async () => {
    try {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, name, course_code, subject_id, subjects(name, color)')
        .order('name');
      setCourses(coursesData || []);
    } catch (err) {
      console.error('Error loading courses:', err);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${daysInMonth(currentYear, currentMonth)}`;

      const { data } = await supabase
        .from('study_events')
        .select('*, courses(name, course_code, subjects(name, color))')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true });

      setEvents(data || []);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── navigation ───────────────────────────────────────────
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // ── calendar grid computation ────────────────────────────
  const calendarDays = useMemo(() => {
    const total = daysInMonth(currentYear, currentMonth);
    const startDay = startDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Previous month padding
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevTotal = daysInMonth(prevYear, prevMonth);
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        day: prevTotal - i,
        dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevTotal - i).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= total; d++) {
      days.push({
        day: d,
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = 42 - days.length; // 6 rows * 7 cols
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        day: d,
        dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // ── events by date lookup ────────────────────────────────
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      if (!map[e.event_date]) map[e.event_date] = [];
      map[e.event_date].push(e);
    });
    return map;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDate] || [];
  }, [eventsByDate, selectedDate]);

  // Upcoming exams in next 7 days
  const upcomingExams = useMemo(() => {
    return events
      .filter((e) => {
        const d = daysUntil(e.event_date);
        return d >= 0 && d <= 7 && e.event_type === 'exam';
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [events]);

  // ── CRUD ─────────────────────────────────────────────────
  const openAddModal = (dateStr) => {
    setEditingEvent(null);
    setForm({
      title: '',
      event_type: 'exam',
      event_date: dateStr || selectedDate,
      start_time: '',
      end_time: '',
      course_id: courses[0]?.id || '',
      notes: '',
      color: EVENT_COLORS[0],
    });
    setShowModal(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      event_type: event.event_type,
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      course_id: event.course_id,
      notes: event.notes || '',
      color: event.color || EVENT_COLORS[0],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.course_id) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        user_id: user.id,
        title: form.title.trim(),
        event_type: form.event_type,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        course_id: form.course_id,
        notes: form.notes.trim() || null,
        color: form.color,
      };

      if (editingEvent) {
        await supabase.from('study_events').update(payload).eq('id', editingEvent.id);
      } else {
        await supabase.from('study_events').insert(payload);
      }

      setShowModal(false);
      await loadEvents();
    } catch (err) {
      console.error('Save event error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await supabase.from('study_events').delete().eq('id', id);
      await loadEvents();
    } catch (err) {
      console.error('Delete event error:', err);
    }
  };

  // ── render ───────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Calendar</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Schedule exams and study sessions for your courses.
          </p>
        </div>
        <button
          id="add-event"
          onClick={() => openAddModal(selectedDate)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 flex items-center gap-2 cursor-pointer self-start"
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'var(--primary-foreground)',
          }}
        >
          <span>+</span> Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* ── Calendar Grid Card ──────────────────────────── */}
        <div
          className="rounded-2xl border p-4 sm:p-6"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-[var(--muted)] cursor-pointer"
                style={{ color: 'var(--primary)' }}
              >
                Today
              </button>
              <button
                onClick={goToPrevMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)] cursor-pointer"
                style={{ color: 'var(--foreground)' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button
                onClick={goToNextMonth}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)] cursor-pointer"
                style={{ color: 'var(--foreground)' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-bold py-2" style={{ color: 'var(--muted-foreground)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden" style={{ background: 'var(--border)' }}>
            {calendarDays.map((cell, i) => {
              const isToday = isSameDay(cell.dateStr, todayStr);
              const isSelected = isSameDay(cell.dateStr, selectedDate);
              const dayEvents = eventsByDate[cell.dateStr] || [];

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className="relative flex flex-col items-center py-2 sm:py-3 min-h-[52px] sm:min-h-[72px] transition-all duration-150 cursor-pointer"
                  style={{
                    background: isSelected
                      ? 'color-mix(in srgb, var(--primary) 12%, var(--card))'
                      : 'var(--card)',
                    opacity: cell.isCurrentMonth ? 1 : 0.35,
                  }}
                >
                  <span
                    className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                      isToday ? 'text-white' : ''
                    }`}
                    style={{
                      background: isToday ? 'var(--primary)' : 'transparent',
                      color: isToday ? 'var(--primary-foreground)' : isSelected ? 'var(--primary)' : 'var(--foreground)',
                    }}
                  >
                    {cell.day}
                  </span>

                  {/* Event dots */}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full px-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: ev.color || 'var(--primary)' }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] font-bold" style={{ color: 'var(--muted-foreground)' }}>+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right Panel ─────────────────────────────────── */}
        <div className="space-y-6">
          {/* Selected Day Events */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={() => openAddModal(selectedDate)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)] cursor-pointer text-lg"
                style={{ color: 'var(--primary)' }}
                title="Add event"
              >
                +
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--muted-foreground)' }}>
                No events scheduled for this day.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev) => {
                  const typeInfo = EVENT_TYPES.find((t) => t.value === ev.event_type) || EVENT_TYPES[0];
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl group transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        background: 'var(--muted)',
                        borderLeft: `3px solid ${ev.color || 'var(--primary)'}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm">{typeInfo.icon}</span>
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{ev.title}</p>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            {ev.courses?.course_code || ev.courses?.name || 'Course'}
                            {ev.start_time && ` · ${ev.start_time.slice(0, 5)}`}
                            {ev.end_time && ` – ${ev.end_time.slice(0, 5)}`}
                          </p>
                          {ev.notes && (
                            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>{ev.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(ev)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--border)] transition-colors cursor-pointer"
                            style={{ color: 'var(--muted-foreground)' }}
                            title="Edit"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1.5l2.5 2.5L4.5 12H2v-2.5L10 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--border)] transition-colors cursor-pointer"
                            style={{ color: 'var(--danger)' }}
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4m1.5 0v7.5a1 1 0 01-1 1h-5a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Exams */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
              <Target weight="fill" size={18} style={{ color: 'var(--danger)' }} /> Upcoming Exams
            </h3>
            {upcomingExams.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: 'var(--muted-foreground)' }}>
                No exams in the next 7 days.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingExams.map((ev) => {
                  const d = daysUntil(ev.event_date);
                  const urgencyColor = d <= 2 ? 'var(--danger)' : d <= 5 ? 'var(--warning)' : 'var(--muted-foreground)';
                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl flex items-center justify-between"
                      style={{ background: 'var(--muted)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{ev.title}</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {ev.courses?.course_code || ev.courses?.name}
                        </p>
                      </div>
                      <span
                        className="text-xs font-bold whitespace-nowrap ml-2 px-2 py-1 rounded-lg"
                        style={{
                          color: urgencyColor,
                          background: `color-mix(in srgb, ${urgencyColor} 12%, transparent)`,
                        }}
                      >
                        {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add/Edit Modal ────────────────────────────────── */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowModal(false)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg z-50 rounded-2xl border shadow-2xl p-6 animate-scale-in"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--foreground)' }}>
              {editingEvent ? 'Edit Event' : 'New Event'}
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="event-title" className="block text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Title</label>
                <input
                  id="event-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Final Exam, Chapter 5 Review"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  autoFocus
                />
              </div>

              {/* Type + Course (side by side) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="event-type" className="block text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Type</label>
                  <select
                    id="event-type"
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer"
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="event-course" className="block text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Course</label>
                  <select
                    id="event-course"
                    value={form.course_id}
                    onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer"
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    <option value="">Select course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.course_code || c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date + Times */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="event-date" className="block text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Date</label>
                  <input
                    id="event-date"
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  />
                </div>
                <div>
                  <label htmlFor="event-start" className="block text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Start</label>
                  <input
                    id="event-start"
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  />
                </div>
                <div>
                  <label htmlFor="event-end" className="block text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>End</label>
                  <input
                    id="event-end"
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className="w-7 h-7 rounded-full transition-all duration-150 cursor-pointer"
                      style={{
                        background: c,
                        boxShadow: form.color === c ? `0 0 0 2px var(--card), 0 0 0 4px ${c}` : 'none',
                        transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="event-notes" className="block text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Notes (optional)</label>
                <textarea
                  id="event-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Study topics, room number, etc."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none transition-colors"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--muted)] cursor-pointer"
                style={{ color: 'var(--muted-foreground)' }}
              >
                Cancel
              </button>
              <button
                id="save-event"
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.course_id}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: 'var(--primary-foreground)',
                }}
              >
                {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
