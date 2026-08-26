'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { TypeBadge, DifficultyBadge, MasteryBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { ArrowsClockwise } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { Lightbulb } from '@phosphor-icons/react/dist/ssr/Lightbulb';

export default function ReviewPage() {
  const supabase = createClient();
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [masteryFilter, setMasteryFilter] = useState('all');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState({});

  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => {
    if (selectedSubject) loadCourses(selectedSubject);
    else { setCourses([]); setSelectedCourse(''); }
  }, [selectedSubject]);
  useEffect(() => {
    if (selectedCourse) loadUnits(selectedCourse);
    else { setUnits([]); setSelectedUnit(''); }
  }, [selectedCourse]);
  useEffect(() => { loadQuestions(); }, [selectedSubject, selectedCourse, selectedUnit, masteryFilter]);

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('id, name').order('name');
    setSubjects(data || []);
  };
  const loadCourses = async (sid) => {
    const { data } = await supabase.from('courses').select('id, name, course_code').eq('subject_id', sid).order('name');
    setCourses(data || []);
  };
  const loadUnits = async (cid) => {
    const { data } = await supabase.from('units').select('id, title').eq('course_id', cid).order('sort_order');
    setUnits(data || []);
  };

  const loadQuestions = async () => {
    setLoading(true);
    let query = supabase.from('questions').select('*, units(title, course_id, courses(name, course_code, subject_id, subjects(name)))');

    if (selectedUnit) {
      query = query.eq('unit_id', selectedUnit);
    } else if (selectedCourse) {
      const { data: unitIds } = await supabase.from('units').select('id').eq('course_id', selectedCourse);
      if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
      else { setQuestions([]); setLoading(false); return; }
    } else if (selectedSubject) {
      const { data: courseIds } = await supabase.from('courses').select('id').eq('subject_id', selectedSubject);
      if (courseIds?.length) {
        const { data: unitIds } = await supabase.from('units').select('id').in('course_id', courseIds.map(c => c.id));
        if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
        else { setQuestions([]); setLoading(false); return; }
      } else { setQuestions([]); setLoading(false); return; }
    }

    if (masteryFilter !== 'all') {
      query = query.eq('mastery_status', masteryFilter);
    }

    const { data } = await query.order('created_at', { ascending: false }).limit(50);
    setQuestions(data || []);
    setLoading(false);
  };

  const updateMastery = async (id, status) => {
    await supabase.from('questions').update({ mastery_status: status }).eq('id', id);
    setQuestions(questions.map(q => q.id === id ? { ...q, mastery_status: status } : q));
  };

  const toggleAnswer = (id) => {
    setShowAnswer(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectStyle = { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center" style={{ color: 'var(--foreground)' }}>
          <span className="mr-2 flex items-center justify-center text-[var(--primary)]"><ArrowsClockwise weight="bold" size={28} /></span>Review Questions
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Browse, review, and manage your question mastery
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle} disabled={!selectedSubject}>
            <option value="">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.course_code || c.name}</option>)}
          </select>
          <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle} disabled={!selectedCourse}>
            <option value="">All Units</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
          </select>
          <select value={masteryFilter} onChange={(e) => setMasteryFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle}>
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="needs_review">Needs Review</option>
            <option value="hard">Hard</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>
      </div>

      {/* Questions */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}</div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlass weight="fill" />}
          title="No questions found"
          description={selectedSubject ? "Try changing your filters or add some questions first." : "Select a subject to browse questions, or add some questions first."}
          action={
            <Link href="/generate" className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              Generate Questions
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
          {questions.map((q) => (
            <div key={q.id} className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <TypeBadge type={q.type} />
                    <DifficultyBadge difficulty={q.difficulty} />
                    <MasteryBadge status={q.mastery_status} />
                    {q.units && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                        {q.units.courses?.course_code || q.units.courses?.name} → {q.units.title}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{q.question_text}</p>
                  {q.question_image_url && (
                    <img src={q.question_image_url} alt="Question" className="mt-2 max-h-32 rounded-lg object-contain" style={{ background: 'var(--muted)' }} />
                  )}
                </div>
                <button
                  onClick={() => toggleAnswer(q.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border flex-shrink-0 transition-all"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                >
                  {showAnswer[q.id] ? 'Hide' : 'Show'} Answer
                </button>
              </div>

              {showAnswer[q.id] && (
                <div className="mt-3 pt-3 border-t space-y-2 animate-fade-in" style={{ borderColor: 'var(--border)' }}>
                  {q.type === 'multiple_choice' && q.choices && (
                    <div className="space-y-1.5">
                      {q.choices.map((c, ci) => {
                        const correctAnswers = q.correct_answer ? q.correct_answer.split('|||').map(a => a.trim()) : [];
                        const isCorrect = correctAnswers.includes(c);
                        const choiceImage = q.answer_images?.[String(ci)];
                        return (
                          <div key={ci} className="text-xs px-3 py-1.5 rounded-lg" style={{
                            background: isCorrect ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--muted)',
                            color: isCorrect ? 'var(--success)' : 'var(--muted-foreground)',
                            fontWeight: isCorrect ? '600' : '400',
                          }}>
                            <div className="flex items-center gap-2">
                              <span>{String.fromCharCode(65 + ci)}. {c}</span>
                              {choiceImage && <img src={choiceImage} alt={`Choice ${String.fromCharCode(65 + ci)}`} className="w-8 h-8 object-cover rounded border ml-auto" style={{ borderColor: 'var(--border)' }} />}
                              {isCorrect && <Check weight="bold" className="inline ml-1" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {q.type === 'written' && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--success)' }}>Answer:</p>
                      <p className="text-xs p-2 rounded-lg" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>{q.correct_answer}</p>
                    </div>
                  )}
                  {q.explanation && (
                    <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}><Lightbulb weight="fill" style={{ color: 'var(--warning)' }} /> {q.explanation}</p>
                  )}
                </div>
              )}

              {/* Mastery buttons */}
              <div className="flex gap-1 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                {['new', 'needs_review', 'hard', 'mastered'].map((s) => (
                  <button key={s} onClick={() => updateMastery(q.id, s)} className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border" style={{
                    borderColor: q.mastery_status === s ? 'var(--primary)' : 'var(--border)',
                    background: q.mastery_status === s ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                    color: q.mastery_status === s ? 'var(--primary)' : 'var(--muted-foreground)',
                  }}>
                    {s === 'needs_review' ? 'Review' : s === 'new' ? 'New' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
