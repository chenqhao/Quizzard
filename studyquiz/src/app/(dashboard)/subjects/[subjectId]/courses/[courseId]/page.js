'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Link from 'next/link';
import { SmileySad } from '@phosphor-icons/react/dist/ssr/SmileySad';
import { CalendarBlank } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { Target } from '@phosphor-icons/react/dist/ssr/Target';
import { ClipboardText } from '@phosphor-icons/react/dist/ssr/ClipboardText';

export default function CourseDetailPage({ params }) {
  const { subjectId, courseId } = use(params);
  const supabase = createClient();
  const [subject, setSubject] = useState(null);
  const [course, setCourse] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [subjectId, courseId]);

  const loadData = async () => {
    const [subjectRes, courseRes, unitsRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('id', subjectId).single(),
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('units').select('*, questions(id, mastery_status)').eq('course_id', courseId).order('sort_order', { ascending: true }),
    ]);
    setSubject(subjectRes.data);
    setCourse(courseRes.data);
    setUnits(unitsRes.data || []);
    setLoading(false);
  };

  const openModal = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setForm({ title: unit.title, description: unit.description || '' });
    } else {
      setEditingUnit(null);
      setForm({ title: '', description: '' });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (editingUnit) {
      await supabase.from('units').update({
        title: form.title.trim(),
        description: form.description.trim() || null,
      }).eq('id', editingUnit.id);
    } else {
      await supabase.from('units').insert({
        course_id: courseId,
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        sort_order: units.length,
      });
    }

    setSaving(false);
    setModalOpen(false);
    loadData();
    window.dispatchEvent(new Event('sidebar-refresh'));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this unit and all its questions?')) return;
    await supabase.from('units').delete().eq('id', id);
    loadData();
    window.dispatchEvent(new Event('sidebar-refresh'));
  };

  const getMasteryStats = (questions) => {
    if (!questions || questions.length === 0) return { total: 0, mastered: 0, pct: 0 };
    const mastered = questions.filter((q) => q.mastery_status === 'mastered').length;
    return { total: questions.length, mastered, pct: Math.round((mastered / questions.length) * 100) };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-80 rounded-lg animate-shimmer" />
        <div className="h-10 w-48 rounded-lg animate-shimmer" />
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl animate-shimmer" />)}</div>
      </div>
    );
  }

  if (!course) {
    return <EmptyState icon={<SmileySad weight="fill" />} title="Course not found" description="This course doesn't exist or was deleted." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Subjects', href: '/subjects' },
        { label: subject?.name, href: `/subjects/${subjectId}` },
        { label: course.course_code || course.name },
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          {course.course_code && (
            <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold mb-2" style={{ background: `color-mix(in srgb, ${subject?.color || 'var(--primary)'} 12%, transparent)`, color: subject?.color || 'var(--primary)' }}>
              {course.course_code}
            </span>
          )}
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>{course.name}</h1>
          {course.semester && <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}><CalendarBlank weight="fill" /> {course.semester}</p>}
          {course.description && <p className="text-sm mt-1 max-w-xl" style={{ color: 'var(--muted-foreground)' }}>{course.description}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/quiz/start?scope=course&courseId=${courseId}&subjectId=${subjectId}`}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift flex items-center gap-2 border"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <span className="flex items-center gap-1.5"><Target weight="fill" size={16} /> Quiz All</span>
          </Link>
          <button
            id="add-unit-btn"
            onClick={() => openModal()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift flex items-center gap-2"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add Unit
          </button>
        </div>
      </div>

      {units.length === 0 ? (
        <EmptyState
          icon={<ClipboardText weight="fill" />}
          title="No units yet"
          description="Break this course into units to organize your questions."
          action={<button onClick={() => openModal()} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>Add first unit</button>}
        />
      ) : (
        <div className="space-y-3">
          {units.map((unit, i) => {
            const stats = getMasteryStats(unit.questions);
            return (
              <Link
                key={unit.id}
                href={`/subjects/${subjectId}/courses/${courseId}/units/${unit.id}`}
                className={`group block rounded-2xl p-5 border hover-lift transition-all duration-300 animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                style={{ background: 'var(--card)', borderColor: 'var(--border)', opacity: 0, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{unit.title}</h3>
                      {unit.description && <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{unit.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                      {stats.total} question{stats.total !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModal(unit); }} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)]" style={{ color: 'var(--muted-foreground)' }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(unit.id); }} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)]" style={{ color: 'var(--danger)' }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M9 6v5M5 6v5M3 3.5l.7 8.4a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
                {stats.total > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stats.pct}%`, background: stats.pct > 70 ? 'var(--success)' : stats.pct > 40 ? 'var(--warning)' : 'var(--primary)' }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>{stats.pct}% mastered</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Unit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUnit ? 'Edit Unit' : 'New Unit'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Unit Title *</label>
            <input id="unit-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Vectors and Dot Products" className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What topics does this unit cover?" rows={3} className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Cancel</button>
            <button id="save-unit-btn" onClick={handleSave} disabled={saving || !form.title.trim()} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift disabled:opacity-50" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              {saving ? 'Saving...' : editingUnit ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
