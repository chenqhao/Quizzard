'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useSearchParams, useRouter } from 'next/navigation';
import { Target } from '@phosphor-icons/react/dist/ssr/Target';
import { Timer } from '@phosphor-icons/react/dist/ssr/Timer';

function QuizStartContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits] = useState([]);
  const [scope, setScope] = useState(searchParams.get('scope') || 'unit');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subjectId') || '');
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get('courseId') || '');
  const [selectedUnit, setSelectedUnit] = useState(searchParams.get('unitId') || '');
  const [questionCount, setQuestionCount] = useState(10);
  const [availableCount, setAvailableCount] = useState(0);
  const [starting, setStarting] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => {
    if (selectedSubject) loadCourses(selectedSubject);
    else { setCourses([]); setSelectedCourse(''); }
  }, [selectedSubject]);
  useEffect(() => {
    if (selectedCourse) loadUnits(selectedCourse);
    else { setUnits([]); setSelectedUnit(''); }
  }, [selectedCourse]);
  useEffect(() => { countQuestions(); }, [scope, selectedSubject, selectedCourse, selectedUnit]);

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

  const countQuestions = async () => {
    let query = supabase.from('questions').select('id', { count: 'exact', head: true });
    if (scope === 'unit' && selectedUnit) {
      query = query.eq('unit_id', selectedUnit);
    } else if (scope === 'course' && selectedCourse) {
      const { data: unitIds } = await supabase.from('units').select('id').eq('course_id', selectedCourse);
      if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
      else { setAvailableCount(0); return; }
    } else if (scope === 'subject' && selectedSubject) {
      const { data: courseIds } = await supabase.from('courses').select('id').eq('subject_id', selectedSubject);
      if (courseIds?.length) {
        const { data: unitIds } = await supabase.from('units').select('id').in('course_id', courseIds.map(c => c.id));
        if (unitIds?.length) query = query.in('unit_id', unitIds.map(u => u.id));
        else { setAvailableCount(0); return; }
      } else { setAvailableCount(0); return; }
    } else { setAvailableCount(0); return; }
    const { count } = await query;
    setAvailableCount(count || 0);
  };

  const startQuiz = async () => {
    setStarting(true);
    // Fetch question IDs
    let query = supabase.from('questions').select('id');
    if (scope === 'unit') query = query.eq('unit_id', selectedUnit);
    else if (scope === 'course') {
      const { data: unitIds } = await supabase.from('units').select('id').eq('course_id', selectedCourse);
      query = query.in('unit_id', unitIds.map(u => u.id));
    } else {
      const { data: courseIds } = await supabase.from('courses').select('id').eq('subject_id', selectedSubject);
      const { data: unitIds } = await supabase.from('units').select('id').in('course_id', courseIds.map(c => c.id));
      query = query.in('unit_id', unitIds.map(u => u.id));
    }
    const { data: allQs } = await query;
    if (!allQs?.length) { setStarting(false); return; }

    // Shuffle and limit
    const shuffled = allQs.sort(() => Math.random() - 0.5).slice(0, questionCount);
    const qIds = shuffled.map(q => q.id);

    // Create quiz attempt
    const { data: { user } } = await supabase.auth.getUser();
    const { data: attempt } = await supabase.from('quiz_attempts').insert({
      user_id: user.id,
      subject_id: selectedSubject || null,
      course_id: selectedCourse || null,
      unit_id: selectedUnit || null,
      scope,
      score: 0,
      total_questions: qIds.length,
    }).select().single();

    // Store question IDs in sessionStorage for the quiz page
    sessionStorage.setItem(`quiz-${attempt.id}`, JSON.stringify(qIds));

    // Store timer config if enabled
    if (timerEnabled) {
      const totalSeconds = (timerMinutes * 60) + timerSeconds;
      sessionStorage.setItem(`quiz-timer-${attempt.id}`, JSON.stringify({
        duration: totalSeconds,
        enabled: true,
      }));
    }

    router.push(`/quiz/${attempt.id}`);
  };

  const isReady = () => {
    if (scope === 'unit') return !!selectedUnit;
    if (scope === 'course') return !!selectedCourse;
    return !!selectedSubject;
  };

  const selectStyle = { background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
          <span className="text-3xl flex items-center justify-center text-[var(--primary)]"><Target weight="fill" size={32} /></span>
        </div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Start a Quiz</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Configure your quiz and test your knowledge</p>
      </div>

      <div className="rounded-2xl border p-6 space-y-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {/* Scope */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Quiz Scope</label>
          <div className="flex rounded-xl p-1" style={{ background: 'var(--muted)' }}>
            {['unit', 'course', 'subject'].map((s) => (
              <button key={s} onClick={() => setScope(s)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all" style={{
                background: scope === s ? 'var(--card)' : 'transparent',
                color: scope === s ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: scope === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Selectors */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Subject</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={selectStyle}>
            <option value="">Select subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {(scope === 'course' || scope === 'unit') && (
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Course</label>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={selectStyle} disabled={!selectedSubject}>
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.course_code || c.name}</option>)}
            </select>
          </div>
        )}

        {scope === 'unit' && (
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Unit</label>
            <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={selectStyle} disabled={!selectedCourse}>
              <option value="">Select unit</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
            </select>
          </div>
        )}

        {/* Question Count */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
            Number of Questions
            <span className="font-normal ml-2" style={{ color: 'var(--muted-foreground)' }}>({availableCount} available)</span>
          </label>
          <div className="flex items-center gap-4">
            <input type="range" min="1" max={Math.max(availableCount, 1)} value={Math.min(questionCount, availableCount || 1)} onChange={(e) => setQuestionCount(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" />
            <span className="text-lg font-bold w-10 text-center" style={{ color: 'var(--foreground)' }}>{Math.min(questionCount, availableCount || 0)}</span>
          </div>
        </div>

        {/* Timer Configuration */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}><Timer size={16} weight="bold" /> Quiz Timer</label>
            <button
              onClick={() => setTimerEnabled(!timerEnabled)}
              className="relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                background: timerEnabled ? 'var(--primary)' : 'var(--border)',
              }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300"
                style={{
                  left: timerEnabled ? '26px' : '2px',
                  background: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {timerEnabled && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(Math.max(0, Math.min(300, parseInt(e.target.value) || 0)))}
                    className="w-full px-4 py-3 rounded-xl border text-sm text-center font-bold outline-none transition-all"
                    style={selectStyle}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <span className="text-xl font-bold mt-5" style={{ color: 'var(--muted-foreground)' }}>:</span>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full px-4 py-3 rounded-xl border text-sm text-center font-bold outline-none transition-all"
                    style={selectStyle}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
              </div>

              {(timerMinutes > 0 || timerSeconds > 0) && availableCount > 0 && (
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  <Timer size={14} weight="bold" />
                  <span>
                    {timerMinutes > 0 ? `${timerMinutes}m` : ''}{timerSeconds > 0 ? ` ${timerSeconds}s` : ''} total
                    {' · '}
                    {(() => {
                      const totalSec = (timerMinutes * 60) + timerSeconds;
                      const perQ = Math.round(totalSec / Math.min(questionCount, availableCount));
                      return `~${perQ}s per question`;
                    })()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        id="start-quiz-btn"
        onClick={startQuiz}
        disabled={starting || !isReady() || availableCount === 0}
        className="w-full py-4 rounded-2xl text-base font-bold transition-all hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: starting ? 'var(--muted)' : 'linear-gradient(135deg, var(--primary), var(--secondary))', color: starting ? 'var(--muted-foreground)' : '#fff' }}
      >
        {starting ? 'Starting...' : availableCount === 0 ? 'No questions available' : `Start Quiz (${Math.min(questionCount, availableCount)} questions)`}
      </button>
    </div>
  );
}

export default function QuizStartPage() {
  return (
    <Suspense fallback={<div className="h-10 w-64 mx-auto rounded-lg animate-shimmer" />}>
      <QuizStartContent />
    </Suspense>
  );
}
