'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { Books } from '@phosphor-icons/react/dist/ssr/Books';
import { Calculator } from '@phosphor-icons/react/dist/ssr/Calculator';
import { Microscope } from '@phosphor-icons/react/dist/ssr/Microscope';
import { Dna } from '@phosphor-icons/react/dist/ssr/Dna';
import { Palette } from '@phosphor-icons/react/dist/ssr/Palette';
import { Bank } from '@phosphor-icons/react/dist/ssr/Bank';
import { Laptop } from '@phosphor-icons/react/dist/ssr/Laptop';
import { Globe } from '@phosphor-icons/react/dist/ssr/Globe';
import { Strategy } from '@phosphor-icons/react/dist/ssr/Strategy';
import { MusicNotes } from '@phosphor-icons/react/dist/ssr/MusicNotes';
import { Scales } from '@phosphor-icons/react/dist/ssr/Scales';
import { Briefcase } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Brain } from '@phosphor-icons/react/dist/ssr/Brain';
import { ChartBar } from '@phosphor-icons/react/dist/ssr/ChartBar';
import { Wrench } from '@phosphor-icons/react/dist/ssr/Wrench';

const COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

const ICON_MAP = {
  'Books': Books,
  'Calculator': Calculator,
  'Microscope': Microscope,
  'Dna': Dna,
  'Palette': Palette,
  'Bank': Bank,
  'Laptop': Laptop,
  'Globe': Globe,
  'Strategy': Strategy,
  'MusicNotes': MusicNotes,
  'Scales': Scales,
  'Briefcase': Briefcase,
  'Brain': Brain,
  'ChartBar': ChartBar,
  'Wrench': Wrench,
  '📚': Books,
  '🧮': Calculator,
  '🔬': Microscope,
  '🧬': Dna,
  '🎨': Palette,
  '🏛️': Bank,
  '💻': Laptop,
  '🌍': Globe,
  '📐': Strategy,
  '🎵': MusicNotes,
  '⚖️': Scales,
  '💼': Briefcase,
  '🧠': Brain,
  '📊': ChartBar,
  '🔧': Wrench,
};
const ICONS = ['Books', 'Calculator', 'Microscope', 'Dna', 'Palette', 'Bank', 'Laptop', 'Globe', 'Strategy', 'MusicNotes', 'Scales', 'Briefcase', 'Brain', 'ChartBar', 'Wrench'];

function renderIcon(iconName) {
  const IconComponent = ICON_MAP[iconName] || Books;
  return <IconComponent weight="fill" />;
}

export default function SubjectsPage() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [form, setForm] = useState({ name: '', color: COLORS[0], icon: ICONS[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('*, courses(id)')
      .order('created_at', { ascending: true });
    setSubjects(data || []);
    setLoading(false);
  };

  const openModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject);
      setForm({ name: subject.name, color: subject.color, icon: subject.icon });
    } else {
      setEditingSubject(null);
      setForm({ name: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], icon: ICONS[0] });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (editingSubject) {
      await supabase.from('subjects').update({
        name: form.name.trim(),
        color: form.color,
        icon: form.icon,
      }).eq('id', editingSubject.id);
    } else {
      await supabase.from('subjects').insert({
        name: form.name.trim(),
        color: form.color,
        icon: form.icon,
        user_id: user.id,
      });
    }

    setSaving(false);
    setModalOpen(false);
    loadSubjects();
    window.dispatchEvent(new Event('sidebar-refresh'));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject and all its courses, units, and questions?')) return;
    await supabase.from('subjects').delete().eq('id', id);
    loadSubjects();
    window.dispatchEvent(new Event('sidebar-refresh'));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg animate-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Subjects</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Organize your study material by subject area
          </p>
        </div>
        <button
          id="add-subject-btn"
          onClick={() => openModal()}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover-lift flex items-center gap-2"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Subject
        </button>
      </div>

      {/* Grid */}
      {subjects.length === 0 ? (
        <EmptyState
          icon={<Books weight="fill" />}
          title="No subjects yet"
          description="Create your first subject to start organizing your courses and study material."
          action={
            <button
              onClick={() => openModal()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Create your first subject
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject, i) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className={`group rounded-2xl p-6 border hover-lift transition-all duration-300 animate-fade-in stagger-${Math.min(i + 1, 6)} relative overflow-hidden`}
              style={{ background: 'var(--card)', borderColor: 'var(--border)', opacity: 0, animationFillMode: 'forwards' }}
            >
              {/* Color accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5"
                style={{ background: subject.color }}
              />

              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `color-mix(in srgb, ${subject.color} 15%, transparent)` }}
                >
                  {renderIcon(subject.icon)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModal(subject); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)]"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M10.5 1.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(subject.id); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)]"
                    style={{ color: 'var(--danger)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 3.5h10M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M9 6v5M5 6v5M3 3.5l.7 8.4a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                {subject.name}
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {subject.courses?.length || 0} course{(subject.courses?.length || 0) !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSubject ? 'Edit Subject' : 'New Subject'} opaque={true}>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Subject Name</label>
            <input
              id="subject-name-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  onClick={() => setForm({ ...form, icon })}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all border"
                  style={{
                    borderColor: form.icon === icon ? 'var(--primary)' : 'var(--border)',
                    background: form.icon === icon ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--muted)',
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
                  onClick={() => setForm({ ...form, color })}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    background: color,
                    boxShadow: form.color === color ? `0 0 0 3px var(--background), 0 0 0 5px ${color}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Cancel
            </button>
            <button
              id="save-subject-btn"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift disabled:opacity-50"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {saving ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
