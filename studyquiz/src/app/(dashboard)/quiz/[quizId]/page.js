'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Warning } from '@phosphor-icons/react/dist/ssr/Warning';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { Timer } from '@phosphor-icons/react/dist/ssr/Timer';
import { CheckSquare } from '@phosphor-icons/react/dist/ssr/CheckSquare';
import { TypeBadge, DifficultyBadge } from '@/components/ui/Badge';

export default function ActiveQuizPage({ params }) {
  const { quizId } = use(params);
  const supabase = createClient();
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Timer state
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(0); // total seconds
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [startTime] = useState(Date.now());
  const timerRef = useRef(null);
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId]);

  const loadQuiz = async () => {
    const qIds = JSON.parse(sessionStorage.getItem(`quiz-${quizId}`) || '[]');
    if (qIds.length === 0) {
      router.push('/quiz/start');
      return;
    }

    // Check for timer config
    const timerConfig = JSON.parse(sessionStorage.getItem(`quiz-timer-${quizId}`) || 'null');
    if (timerConfig?.enabled && timerConfig.duration > 0) {
      setTimerEnabled(true);
      setTimerDuration(timerConfig.duration);
      setTimeRemaining(timerConfig.duration);
    }

    const { data } = await supabase
      .from('questions')
      .select('*')
      .in('id', qIds);

    // Maintain the shuffled order from sessionStorage
    const ordered = qIds.map(id => data?.find(q => q.id === id)).filter(Boolean);
    setQuestions(ordered);
    setLoading(false);
  };

  // Start timer once questions are loaded
  useEffect(() => {
    if (timerEnabled && timerDuration > 0 && !loading && questions.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const next = prev - 1;
          if (next <= 0) {
            clearInterval(timerRef.current);
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerEnabled, timerDuration, loading, questions.length]);

  // Auto-submit memoized
  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (submitting) return;
    setSubmitting(true);

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

      // Grade each answer
      const results = [];
      for (const q of questions) {
        const userAnswer = answers[q.id] || '';
        let isCorrect = false;
        let feedback = null;

        if (q.type === 'multiple_choice') {
          // Parse correct answers (stored as '|||' delimited or single string)
          const correctAnswers = q.correct_answer.includes('|||') 
            ? q.correct_answer.split('|||').map(a => a.trim())
            : [q.correct_answer.trim()];

          // Parse user answers (stored as '|||' delimited for multi-select, or single string)
          const userAnswers = typeof userAnswer === 'string' && userAnswer.includes('|||')
            ? userAnswer.split('|||').map(a => a.trim())
            : userAnswer ? [userAnswer.trim()] : [];

          // Compare as sets
          const correctSet = new Set(correctAnswers);
          const userSet = new Set(userAnswers);
          isCorrect = correctSet.size === userSet.size && [...correctSet].every(a => userSet.has(a));
        } else if (userAnswer.trim()) {
          try {
            const res = await fetch('/api/quiz/grade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: q.question_text,
                sampleAnswer: q.correct_answer,
                userAnswer,
              }),
            });
            if (res.ok) {
              const grading = await res.json();
              isCorrect = grading.is_correct;
              feedback = grading.feedback;
            }
          } catch {
            feedback = 'Could not grade automatically. Needs manual review.';
          }
        }

        results.push({
          quiz_attempt_id: quizId,
          question_id: q.id,
          user_answer: userAnswer || null,
          is_correct: isCorrect,
          ai_feedback: isAutoSubmit && !userAnswer ? 'Time ran out — not answered.' : feedback,
        });
      }

      // Save answers
      await supabase.from('quiz_answers').insert(results);

      // Update score + time
      const score = results.filter(r => r.is_correct).length;
      await supabase.from('quiz_attempts').update({
        score,
        total_questions: questions.length,
        time_spent_seconds: elapsedSeconds,
        timer_duration_seconds: timerEnabled ? timerDuration : null,
      }).eq('id', quizId);

      // Clean up sessionStorage
      sessionStorage.removeItem(`quiz-${quizId}`);
      sessionStorage.removeItem(`quiz-timer-${quizId}`);

      router.push(`/quiz/${quizId}/results`);
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitting(false);
    }
  }, [submitting, questions, answers, quizId, startTime, timerEnabled, timerDuration, supabase, router]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timerEnabled && timeRemaining <= 0 && !loading && questions.length > 0 && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      handleSubmit(true);
    }
  }, [timeRemaining, timerEnabled, loading, questions.length, handleSubmit]);

  const currentQ = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Timer helpers
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerPercentage = timerDuration > 0 ? (timeRemaining / timerDuration) * 100 : 100;
  const timerClass = timerPercentage <= 10 ? 'timer-critical' : timerPercentage <= 25 ? 'timer-warning' : '';

  const getTimerColor = () => {
    if (timerPercentage > 50) return 'var(--success)';
    if (timerPercentage > 25) return 'var(--warning)';
    return 'var(--danger)';
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-2 w-full rounded-full mb-8 animate-shimmer" />
        <div className="h-64 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p style={{ color: 'var(--muted-foreground)' }}>No questions found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Timer Bar */}
      {timerEnabled && (
        <div className={`rounded-2xl border p-4 transition-all ${timerClass}`} style={{
          background: 'var(--card)',
          borderColor: timerPercentage <= 10 ? 'var(--danger)' : 'var(--border)',
        }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              <span
                className="text-2xl font-mono font-bold tracking-wider"
                style={{ color: getTimerColor() }}
              >
                {formatTimer(timeRemaining)}
              </span>
            </div>
            <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: timerPercentage <= 10 ? 'var(--danger)' : 'var(--muted-foreground)' }}>
              {timerPercentage <= 10 ? <><Warning weight="fill" /> Almost out of time!</> : timerPercentage <= 25 ? 'Hurry up!' : 'Time remaining'}
            </p>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${timerPercentage}%`,
                background: timerPercentage > 50
                  ? 'linear-gradient(90deg, var(--success), #059669)'
                  : timerPercentage > 25
                    ? 'linear-gradient(90deg, var(--warning), #d97706)'
                    : 'linear-gradient(90deg, var(--danger), #dc2626)',
              }}
            />
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
          <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="rounded-2xl border p-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex gap-2 mb-4">
          <TypeBadge type={currentQ.type} />
          <DifficultyBadge difficulty={currentQ.difficulty} />
        </div>

        <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
          {currentQ.question_text}
        </h2>

        {currentQ.type === 'multiple_choice' ? (
          <div className="space-y-3">
            {currentQ.is_multi_select && (
              <p className="text-xs font-medium px-1 flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                <CheckSquare className="w-4 h-4" />
                Select all correct answers
              </p>
            )}
            {currentQ.choices?.map((choice, ci) => {
              // For multi-select, answers[currentQ.id] is '|||'-delimited string
              const isMulti = currentQ.is_multi_select;
              const currentAnswers = isMulti 
                ? (answers[currentQ.id] ? answers[currentQ.id].split('|||') : [])
                : [answers[currentQ.id]];
              const isSelected = currentAnswers.includes(choice);

              const handleClick = () => {
                if (isMulti) {
                  // Toggle this choice in the array
                  let next = answers[currentQ.id] ? answers[currentQ.id].split('|||') : [];
                  if (next.includes(choice)) {
                    next = next.filter(a => a !== choice);
                  } else {
                    next.push(choice);
                  }
                  setAnswers({ ...answers, [currentQ.id]: next.length > 0 ? next.join('|||') : '' });
                } else {
                  setAnswers({ ...answers, [currentQ.id]: choice });
                }
              };

              return (
                <button
                  key={ci}
                  onClick={handleClick}
                  className="w-full text-left px-5 py-4 rounded-xl border text-sm font-medium transition-all"
                  style={{
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                    background: isSelected ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--muted)',
                    color: isSelected ? 'var(--primary)' : 'var(--foreground)',
                    boxShadow: isSelected ? '0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent)' : 'none',
                  }}
                >
                  <span className="inline-flex items-center gap-3">
                    {isMulti ? (
                      <span
                        className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all text-xs"
                        style={{
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          color: isSelected ? 'var(--primary-foreground)' : 'transparent',
                        }}
                      >
                        {isSelected && <Check weight="bold" />}
                      </span>
                    ) : (
                      <span className="font-bold" style={{ color: 'var(--muted-foreground)' }}>{String.fromCharCode(65 + ci)}.</span>
                    )}
                    {choice}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            value={answers[currentQ.id] || ''}
            onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
            placeholder="Type your answer here..."
            rows={6}
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-y"
            style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border disabled:opacity-30"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          ← Previous
        </button>

        {/* Question dots */}
        <div className="hidden sm:flex gap-1.5 flex-wrap justify-center max-w-xs">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                background: i === currentIndex
                  ? 'var(--primary)'
                  : answers[q.id]
                    ? 'var(--success)'
                    : 'var(--border)',
              }}
            />
          ))}
        </div>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Next →
          </button>
        ) : (
          <button
            id="submit-quiz-btn"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover-lift disabled:opacity-50"
            style={{ background: submitting ? 'var(--muted)' : 'var(--success)', color: submitting ? 'var(--muted-foreground)' : '#fff' }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent" style={{ animation: 'spin 1s linear infinite' }} />
                Grading...
              </span>
            ) : 'Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  );
}
