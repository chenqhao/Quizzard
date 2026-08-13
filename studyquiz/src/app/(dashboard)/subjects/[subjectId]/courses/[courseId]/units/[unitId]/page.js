'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { Badge, DifficultyBadge, TypeBadge, MasteryBadge } from '@/components/ui/Badge';
import Link from 'next/link';
import { SmileySad } from '@phosphor-icons/react/dist/ssr/SmileySad';
import { Target } from '@phosphor-icons/react/dist/ssr/Target';
import { Sparkle } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Question } from '@phosphor-icons/react/dist/ssr/Question';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { Notepad } from '@phosphor-icons/react/dist/ssr/Notepad';
import { PencilSimple } from '@phosphor-icons/react/dist/ssr/PencilSimple';

export default function UnitDetailPage({ params }) {
  const { subjectId, courseId, unitId } = use(params);
  const supabase = createClient();
  const [subject, setSubject] = useState(null);
  const [course, setCourse] = useState(null);
  const [unit, setUnit] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [expandedQ, setExpandedQ] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyMC = { type: 'multiple_choice', question_text: '', choices: ['', '', '', ''], correct_answers: [], explanation: '', difficulty: 'medium', is_multi_select: false };
  const emptyWritten = { type: 'written', question_text: '', correct_answer: '', explanation: '', difficulty: 'medium' };
  const [form, setForm] = useState(emptyMC);

  useEffect(() => { loadData(); }, [unitId]);

  const loadData = async () => {
    const [subRes, courseRes, unitRes, qRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('id', subjectId).single(),
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('units').select('*').eq('id', unitId).single(),
      supabase.from('questions').select('*').eq('unit_id', unitId).order('created_at', { ascending: true }),
    ]);
    setSubject(subRes.data);
    setCourse(courseRes.data);
    setUnit(unitRes.data);
    setQuestions(qRes.data || []);
    setLoading(false);
  };

  const openModal = (question = null) => {
    if (question) {
      setEditingQuestion(question);
      setForm({
        type: question.type,
        question_text: question.question_text,
        choices: question.type === 'multiple_choice' ? (question.choices || ['', '', '', '']) : ['', '', '', ''],
        correct_answers: question.type === 'multiple_choice' ? (question.correct_answer ? question.correct_answer.split('|||') : []) : [],
        correct_answer: question.type === 'written' ? question.correct_answer : '',
        explanation: question.explanation || '',
        difficulty: question.difficulty,
        is_multi_select: question.is_multi_select || false,
      });
    } else {
      setEditingQuestion(null);
      setForm(emptyMC);
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.question_text?.trim()) return;
    if (form.type === 'multiple_choice' && (!form.correct_answers || form.correct_answers.length === 0)) return;
    if (form.type === 'written' && !form.correct_answer?.trim()) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      type: form.type,
      question_text: form.question_text.trim(),
      choices: form.type === 'multiple_choice' ? form.choices.filter(c => c.trim()) : null,
      correct_answer: form.type === 'multiple_choice' ? form.correct_answers.filter(c => c.trim()).join('|||') : form.correct_answer?.trim() || '',
      explanation: form.explanation?.trim() || null,
      difficulty: form.difficulty,
      is_multi_select: form.type === 'multiple_choice' ? form.is_multi_select : false,
    };

    let error = null;
    if (editingQuestion) {
      const res = await supabase.from('questions').update(payload).eq('id', editingQuestion.id);
      error = res.error;
    } else {
      const res = await supabase.from('questions').insert({ ...payload, unit_id: unitId, user_id: user.id, created_by: 'manual' });
      error = res.error;
    }

    setSaving(false);

    if (error) {
      console.error("DB Error:", error);
      alert("Failed to save question: " + error.message + "\n\nDid you run the multi_select_migration.sql in Supabase?");
      return;
    }

    setModalOpen(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this question?')) return;
    await supabase.from('questions').delete().eq('id', id);
    loadData();
  };

  const updateMastery = async (id, status) => {
    await supabase.from('questions').update({ mastery_status: status }).eq('id', id);
    setQuestions(questions.map(q => q.id === id ? { ...q, mastery_status: status } : q));
  };

  if (loading) {
    return <div className="space-y-6"><div className="h-6 w-96 rounded-lg animate-shimmer" /><div className="h-10 w-48 rounded-lg animate-shimmer" /><div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}</div></div>;
  }

  if (!unit) return <EmptyState icon={<SmileySad weight="fill" />} title="Unit not found" description="This unit doesn't exist or was deleted." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Subjects', href: '/subjects' },
        { label: subject?.name, href: `/subjects/${subjectId}` },
        { label: course?.course_code || course?.name, href: `/subjects/${subjectId}/courses/${courseId}` },
        { label: unit.title },
      ]} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>{unit.title}</h1>
          {unit.description && <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{unit.description}</p>}
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/quiz/start?scope=unit&unitId=${unitId}&courseId=${courseId}&subjectId=${subjectId}`}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift flex items-center gap-2 border"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
            <span className="flex items-center gap-1.5"><Target weight="fill" size={16} /> Start Quiz</span>
          </Link>
          <Link
            href={`/generate?unitId=${unitId}&courseId=${courseId}&subjectId=${subjectId}`}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--secondary))', color: '#fff' }}
          >
            <span className="flex items-center gap-1.5"><Sparkle weight="fill" size={16} /> Generate with AI</span>
          </Link>
          <button
            id="add-question-btn"
            onClick={() => openModal()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift flex items-center gap-2"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Add Question
          </button>
        </div>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <EmptyState
          icon={<Question weight="fill" />}
          title="No questions yet"
          description="Add questions manually or generate them with AI from your class notes."
          action={
            <div className="flex gap-3">
              <button onClick={() => openModal()} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>Add manually</button>
              <Link href={`/generate?unitId=${unitId}&courseId=${courseId}&subjectId=${subjectId}`} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift" style={{ background: 'var(--accent)', color: '#fff' }}>Generate with AI</Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`rounded-2xl border transition-all duration-300 animate-fade-in stagger-${Math.min(i + 1, 6)} overflow-hidden`}
              style={{ background: 'var(--card)', borderColor: 'var(--border)', opacity: 0, animationFillMode: 'forwards' }}
            >
              <div
                className="p-4 cursor-pointer flex items-start gap-4"
                onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
              >
                <span className="text-sm font-bold mt-0.5 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{q.question_text}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <TypeBadge type={q.type} />
                    <DifficultyBadge difficulty={q.difficulty} />
                    <MasteryBadge status={q.mastery_status} />
                    {q.created_by === 'ai' && <Badge variant="secondary">AI</Badge>}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`flex-shrink-0 mt-1 transition-transform ${expandedQ === q.id ? 'rotate-180' : ''}`} style={{ color: 'var(--muted-foreground)' }}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              {expandedQ === q.id && (
                <div className="px-4 pb-4 border-t pt-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
                  {q.type === 'multiple_choice' && q.choices && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Choices</p>
                      {q.choices.map((choice, ci) => (
                        <div key={ci} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{
                          background: choice === q.correct_answer ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--muted)',
                          color: choice === q.correct_answer ? 'var(--success)' : 'var(--foreground)',
                          fontWeight: choice === q.correct_answer ? '600' : '400',
                        }}>
                          <span>{String.fromCharCode(65 + ci)}.</span>
                          <span>{choice}</span>
                          {choice === q.correct_answer && <span className="ml-auto flex items-center"><Check weight="bold" /></span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'written' && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-foreground)' }}>Sample Answer</p>
                      <p className="text-sm p-3 rounded-lg" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>{q.correct_answer}</p>
                    </div>
                  )}
                  {q.explanation && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted-foreground)' }}>Explanation</p>
                      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{q.explanation}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-1">
                      {['new', 'needs_review', 'hard', 'mastered'].map((s) => (
                        <button key={s} onClick={() => updateMastery(q.id, s)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border" style={{
                          borderColor: q.mastery_status === s ? 'var(--primary)' : 'var(--border)',
                          background: q.mastery_status === s ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                          color: q.mastery_status === s ? 'var(--primary)' : 'var(--muted-foreground)',
                        }}>
                          {s === 'needs_review' ? 'Needs Review' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openModal(q)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)]" style={{ color: 'var(--muted-foreground)' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 1.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--muted)]" style={{ color: 'var(--danger)' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M9 6v5M5 6v5M3 3.5l.7 8.4a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Question Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingQuestion ? 'Edit Question' : 'Add Question'} size="lg">
        <div className="space-y-5">
          {/* Type Toggle */}
          <div className="flex rounded-xl p-1" style={{ background: 'var(--muted)' }}>
            {['multiple_choice', 'written'].map((t) => (
              <button key={t} onClick={() => setForm({ ...(t === 'multiple_choice' ? emptyMC : emptyWritten), question_text: form.question_text, explanation: form.explanation, difficulty: form.difficulty })}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: form.type === t ? 'var(--card)' : 'transparent', color: form.type === t ? 'var(--foreground)' : 'var(--muted-foreground)', boxShadow: form.type === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {t === 'multiple_choice' ? <span className="flex items-center gap-1.5 justify-center"><Notepad weight="fill" /> Multiple Choice</span> : <span className="flex items-center gap-1.5 justify-center"><PencilSimple weight="fill" /> Written Answer</span>}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Question *</label>
            <textarea id="question-text-input" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} placeholder="Enter your question..." rows={3} className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} autoFocus />
          </div>

          {form.type === 'multiple_choice' ? (
            <>
              <div className="flex items-center gap-2 mb-2 p-3 rounded-xl border transition-all" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
                <input type="checkbox" id="multi-select-toggle" checked={form.is_multi_select} onChange={(e) => setForm({ ...form, is_multi_select: e.target.checked, correct_answers: [] })} className="w-4 h-4 accent-[var(--primary)]" />
                <label htmlFor="multi-select-toggle" className="text-sm font-semibold cursor-pointer select-none" style={{ color: 'var(--foreground)' }}>Allow multiple correct answers</label>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Answer Choices</label>
                <div className="space-y-2">
                  {form.choices.map((choice, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <input 
                        type={form.is_multi_select ? "checkbox" : "radio"} 
                        name="correct" 
                        checked={form.correct_answers.includes(choice) && choice !== ''} 
                        onChange={() => {
                          if (form.is_multi_select) {
                            const newAnswers = form.correct_answers.includes(choice) 
                              ? form.correct_answers.filter(c => c !== choice) 
                              : [...form.correct_answers, choice];
                            setForm({ ...form, correct_answers: newAnswers });
                          } else {
                            setForm({ ...form, correct_answers: [choice] });
                          }
                        }} 
                        className="w-4 h-4 accent-[var(--primary)]" 
                      />
                      <span className="text-sm font-bold w-6" style={{ color: 'var(--muted-foreground)' }}>{String.fromCharCode(65 + ci)}.</span>
                      <input 
                        value={choice} 
                        onChange={(e) => { 
                          const c = [...form.choices]; 
                          const oldChoice = c[ci];
                          const newVal = e.target.value;
                          c[ci] = newVal; 
                          let newAnswers = [...form.correct_answers];
                          // Update the selected answer if they edit the text of an already selected choice
                          if (newAnswers.includes(oldChoice)) {
                            newAnswers = newAnswers.map(ans => ans === oldChoice ? newVal : ans);
                          }
                          setForm({ ...form, choices: c, correct_answers: newAnswers }); 
                        }} 
                        placeholder={`Option ${String.fromCharCode(65 + ci)}`} 
                        className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors" 
                        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} 
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                  {form.is_multi_select ? 'Select checkboxes for all correct answers.' : 'Select the radio button next to the correct answer.'}
                </p>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Sample Answer *</label>
              <textarea value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} placeholder="The ideal answer to this question..." rows={4} className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Explanation</label>
            <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Why is this the correct answer?" rows={2} className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none" style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Difficulty</label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map((d) => (
                <button key={d} onClick={() => setForm({ ...form, difficulty: d })} className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all border" style={{
                  borderColor: form.difficulty === d ? 'var(--primary)' : 'var(--border)',
                  background: form.difficulty === d ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                  color: form.difficulty === d ? 'var(--primary)' : 'var(--muted-foreground)',
                }}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Cancel</button>
            <button id="save-question-btn" onClick={handleSave} disabled={saving || !form.question_text.trim() || (form.type === 'multiple_choice' ? form.correct_answers.length === 0 : !form.correct_answer.trim())} className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift disabled:opacity-50" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              {saving ? 'Saving...' : editingQuestion ? 'Update' : 'Add Question'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
