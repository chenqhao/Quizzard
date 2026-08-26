'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useSearchParams } from 'next/navigation';
import { Sparkle } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { ClipboardText } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { Lightbulb } from '@phosphor-icons/react/dist/ssr/Lightbulb';
import { DifficultyBadge, TypeBadge } from '@/components/ui/Badge';

function GeneratePageContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subjectId') || '');
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get('courseId') || '');
  const [selectedUnit, setSelectedUnit] = useState(searchParams.get('unitId') || '');
  const [notes, setNotes] = useState('');
  const [count, setCount] = useState(5);
  const [type, setType] = useState('mixed');
  const [difficulty, setDifficulty] = useState('medium');
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedQs, setSelectedQs] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) loadCourses(selectedSubject);
    else { setCourses([]); setSelectedCourse(''); }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedCourse) loadUnits(selectedCourse);
    else { setUnits([]); setSelectedUnit(''); }
  }, [selectedCourse]);

  const loadSubjects = async () => {
    const { data } = await supabase.from('subjects').select('id, name').order('name');
    setSubjects(data || []);
  };

  const loadCourses = async (subjectId) => {
    const { data } = await supabase.from('courses').select('id, name, course_code').eq('subject_id', subjectId).order('name');
    setCourses(data || []);
  };

  const loadUnits = async (courseId) => {
    const { data } = await supabase.from('units').select('id, title').eq('course_id', courseId).order('sort_order');
    setUnits(data || []);
  };

  const handleGenerate = async () => {
    if (!notes.trim() || !selectedUnit) return;
    setGenerating(true);
    setError(null);
    setGeneratedQuestions([]);
    setSaved(false);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, count, type, difficulty }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate questions');
      }

      const data = await res.json();
      setGeneratedQuestions(data.questions);
      setSelectedQs(new Set(data.questions.map((_, i) => i)));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleQ = (i) => {
    const next = new Set(selectedQs);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelectedQs(next);
  };

  const handleSave = async () => {
    if (selectedQs.size === 0 || !selectedUnit) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const toSave = generatedQuestions
      .filter((_, i) => selectedQs.has(i))
      .map((q) => ({
        unit_id: selectedUnit,
        user_id: user.id,
        type: q.type,
        question_text: q.question_text,
        choices: q.type === 'multiple_choice' ? q.choices : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        difficulty: q.difficulty,
        created_by: 'ai',
        is_multi_select: q.is_multi_select || false,
        question_image_url: null,
        answer_images: null,
      }));

    const { error } = await supabase.from('questions').insert(toSave);
    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setGeneratedQuestions([]);
    }
    setSaving(false);
  };

  const selectStyle = {
    background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)',
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center" style={{ color: 'var(--foreground)' }}>
          <Sparkle weight="fill" size={32} className="mr-2 text-[var(--primary)]" />AI Question Generator
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Paste your class notes and let AI create quiz questions for you
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl border flex items-center gap-3" style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', borderColor: 'var(--success)', color: 'var(--success)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--success)]" style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)' }}>
            <CheckCircle weight="fill" size={24} />
          </div>
          <p className="text-sm font-medium">Questions saved successfully! They&apos;re now in your question bank.</p>
        </div>
      )}

      {/* Target Selection */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Save to</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Subject</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle}>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Course</label>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle} disabled={!selectedSubject}>
              <option value="">Select course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.course_code || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>Unit</label>
            <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle} disabled={!selectedCourse}>
              <option value="">Select unit</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Notes Input */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--foreground)' }}>Your Class Notes</h2>
        <textarea
          id="notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste your class notes, textbook content, or lecture summaries here. The AI will generate questions based only on this content..."
          rows={10}
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-y"
          style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)', minHeight: '200px' }}
        />
        <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>{notes.length} characters</p>
      </div>

      {/* Options */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--foreground)' }}>Options</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>Number of Questions</label>
            <div className="flex items-center gap-3">
              <input type="range" min="1" max="20" value={count} onChange={(e) => setCount(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" />
              <span className="text-sm font-bold w-8 text-center" style={{ color: 'var(--foreground)' }}>{count}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>Question Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={selectStyle}>
              <option value="mixed">Mixed</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="written">Written Answer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>Difficulty</label>
            <div className="flex gap-1.5">
              {['easy', 'medium', 'hard'].map((d) => (
                <button key={d} onClick={() => setDifficulty(d)} className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border" style={{
                  borderColor: difficulty === d ? 'var(--primary)' : 'var(--border)',
                  background: difficulty === d ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                  color: difficulty === d ? 'var(--primary)' : 'var(--muted-foreground)',
                }}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border" style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Generate Button */}
      <button
        id="generate-btn"
        onClick={handleGenerate}
        disabled={generating || !notes.trim() || !selectedUnit}
        className="w-full py-4 rounded-2xl text-sm font-bold transition-all hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: generating ? 'var(--muted)' : 'linear-gradient(135deg, var(--primary), var(--secondary))', color: generating ? 'var(--muted-foreground)' : '#fff' }}
      >
        {generating ? (
          <>
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--muted-foreground)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            Generating questions...
          </>
        ) : (
          <span className="flex items-center gap-2"><Sparkle weight="fill" size={18} /> Generate {count} Questions</span>
        )}
      </button>

      {/* Generated Questions Preview */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              Generated Questions ({generatedQuestions.length})
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setSelectedQs(new Set(generatedQuestions.map((_, i) => i)))} className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>Select All</button>
              <button onClick={() => setSelectedQs(new Set())} className="px-3 py-1.5 rounded-lg text-xs font-medium border" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>Deselect All</button>
            </div>
          </div>

          {generatedQuestions.map((q, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-5 transition-all cursor-pointer ${selectedQs.has(i) ? 'ring-2' : ''}`}
              onClick={() => toggleQ(i)}
              style={{
                background: 'var(--card)',
                borderColor: selectedQs.has(i) ? 'var(--primary)' : 'var(--border)',
                '--tw-ring-color': 'color-mix(in srgb, var(--primary) 30%, transparent)',
              }}
            >
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedQs.has(i)} onChange={() => toggleQ(i)} className="mt-1 w-4 h-4 accent-[var(--primary)]" onClick={(e) => e.stopPropagation()} />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>{q.question_text}</p>
                  <div className="flex gap-2 mb-3">
                    <TypeBadge type={q.type} />
                    <DifficultyBadge difficulty={q.difficulty} />
                  </div>
                  {q.type === 'multiple_choice' && q.choices && (
                    <div className="space-y-1.5 mb-2">
                      {q.choices.map((c, ci) => {
                        const correctList = q.correct_answers || (q.correct_answer ? (Array.isArray(q.correct_answer) ? q.correct_answer : q.correct_answer.split('|||')) : []);
                        const isCorrect = correctList.includes(c);
                        return (
                          <div key={ci} className="text-xs px-3 py-1.5 rounded-lg" style={{
                            background: isCorrect ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--muted)',
                            color: isCorrect ? 'var(--success)' : 'var(--muted-foreground)',
                            fontWeight: isCorrect ? '600' : '400',
                          }}>
                            <div className="flex items-center gap-1 flex-1">
                              {String.fromCharCode(65 + ci)}. {c} {isCorrect && <Check weight="bold" size={16} />}
                            </div>
                          </div>
                        );
                      })}
                      {q.is_multi_select && (
                        <p className="text-xs font-medium flex items-center gap-1.5 mt-1" style={{ color: 'var(--accent)' }}><ClipboardText weight="fill" size={14} /> Select all that apply</p>
                      )}
                    </div>
                  )}
                  {q.type === 'written' && (
                    <p className="text-xs p-2 rounded-lg mb-2" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                      <strong>Answer:</strong> {q.correct_answer}
                    </p>
                  )}
                  {q.explanation && (
                    <div className="flex items-start gap-1.5 mt-3 pt-3" style={{ borderTop: '0.5px solid var(--border)' }}>
                      <Lightbulb weight="fill" size={14} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{q.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            id="save-generated-btn"
            onClick={handleSave}
            disabled={saving || selectedQs.size === 0}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all hover-lift disabled:opacity-50"
            style={{ background: 'var(--success)', color: '#fff' }}
          >
            {saving ? 'Saving...' : `Save ${selectedQs.size} Question${selectedQs.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="h-10 w-64 rounded-lg animate-shimmer" />}>
      <GeneratePageContent />
    </Suspense>
  );
}
