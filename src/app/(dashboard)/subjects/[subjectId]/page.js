'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Link from 'next/link';
import { SmileySad } from '@phosphor-icons/react/dist/ssr/SmileySad';
import { Book } from '@phosphor-icons/react/dist/ssr/Book';
import { CalendarBlank } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { renderIcon } from '@/lib/icons';

export default function SubjectDetailPage({ params }) {
  const { subjectId } = use(params);
  const supabase = createClient();
  const [subject, setSubject] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState({ name: '', course_code: '', semester: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const loadData = async () => {
    const [subjectRes, coursesRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('id', subjectId).single(),
      supabase.from('courses').select('*, units(id)').eq('subject_id', subjectId).order('created_at', { ascending: true }),
    ]);
    setSubject(subjectRes.data);
    setCourses(coursesRes.data || []);
    setLoading(false);
  };

  const openModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setForm({ name: course.name, course_code: course.course_code || '', semester: course.semester || '', description: course.description || '' });
    } else {
      setEditingCourse(null);
      setForm({ name: '', course_code: '', semester: '', description: '' });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (editingCourse) {
      await supabase.from('courses').update({
        name: form.name.trim(),
        course_code: form.course_code.trim() || null,
        semester: form.semester.trim() || null,
        description: form.description.trim() || null,
      }).eq('id', editingCourse.id);
    } else {
      await supabase.from('courses').insert({
        subject_id: subjectId,
        user_id: user.id,
        name: form.name.trim(),
        course_code: form.course_code.trim() || null,
        semester: form.semester.trim() || null,
        description: form.description.trim() || null,
      });
    }

    setSaving(false);
    setModalOpen(false);
    loadData();
    window.dispatchEvent(new Event('sidebar-refresh'));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this course and all its units and questions?')) return;
    await supabase.from('courses').delete().eq('id', id);
    loadData();
    window.dispatchEvent(new Event('sidebar-refresh'));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-64 rounded-lg animate-shimmer" />
        <div className="h-10 w-48 rounded-lg animate-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-44 rounded-2xl animate-shimmer" />)}
        </div>
      </div>
    );
  }

  if (!subject) {
    return <EmptyState icon={<SmileySad weight="fill" />} title="Subject not found" description="This subject doesn't exist or was deleted." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Subjects', href: '/subjects' },
        { label: subject.name },
      ]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `color-mix(in srgb, ${subject.color} 15%, transparent)` }}>
            {renderIcon(subject.icon)}
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>{subject.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {courses.length} course{courses.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          id="add-course-btn"
          onClick={() => openModal()}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover-lift flex items-center gap-2"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Course
        </button>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<Book weight="fill" />}
          title="No courses yet"
          description="Add your first course to this subject."
          action={
            <button onClick={() => openModal()} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              Add course
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((course, i) => (
            <Link
              key={course.id}
              href={`/subjects/${subjectId}/courses/${course.id}`}
              className={`group rounded-2xl p-6 border hover-lift transition-all duration-300 animate-fade-in stagger-${Math.min(i + 1, 6)} relative`}
              style={{ background: 'var(--card)', borderColor: 'var(--border)', opacity: 0, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  {course.course_code && (
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold mb-2" style={{ background: `color-mix(in srgb, ${subject.color} 12%, transparent)`, color: subject.color }}>
                      {course.course_code}
                    </span>
                  )}
                  <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{course.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModal(course); }} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)]" style={{ color: 'var(--muted-foreground)' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(course.id); }} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)]" style={{ color: 'var(--danger)' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M9 6v5M5 6v5M3 3.5l.7 8.4a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
              {course.semester && <p className="text-xs mb-1 flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}><CalendarBlank weight="fill" /> {course.semester}</p>}
              {course.description && <p className="text-sm line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>{course.description}</p>}
              <p className="text-xs mt-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>
                {course.units?.length || 0} unit{(course.units?.length || 0) !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Course Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCourse ? 'Edit Course' : 'New Course'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Course Name *</label>
            <input id="course-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Multivariable Calculus" className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Course Code</label>
              <input value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} placeholder="e.g., MATH 253" className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Semester</label>
              <input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="e.g., Fall 2026" className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief course description..." rows={3} className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Cancel</button>
            <button id="save-course-btn" onClick={handleSave} disabled={saving || !form.name.trim()} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift disabled:opacity-50" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              {saving ? 'Saving...' : editingCourse ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
