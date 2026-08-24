'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { TypeBadge, DifficultyBadge } from '@/components/ui/Badge';
import { Confetti } from '@phosphor-icons/react/dist/ssr/Confetti';
import { ThumbsUp } from '@phosphor-icons/react/dist/ssr/ThumbsUp';
import { Books } from '@phosphor-icons/react/dist/ssr/Books';
import { Barbell } from '@phosphor-icons/react/dist/ssr/Barbell';
import { TrayArrowUp } from '@phosphor-icons/react/dist/ssr/TrayArrowUp';
import { Link as LinkIcon } from '@phosphor-icons/react/dist/ssr/Link';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { ClipboardText } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { Sparkle } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { X } from '@phosphor-icons/react/dist/ssr/X';
import { Robot } from '@phosphor-icons/react/dist/ssr/Robot';
import { Lightbulb } from '@phosphor-icons/react/dist/ssr/Lightbulb';
import { Notepad } from '@phosphor-icons/react/dist/ssr/Notepad';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle';

function formatTime(seconds) {
  if (!seconds || seconds === 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function QuizResultsPage({ params }) {
  const { quizId } = use(params);
  const supabase = createClient();
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Share state
  const [showShareModal, setShowShareModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Import code state
  const [importCode, setImportCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => { loadResults(); }, [quizId]);

  const loadResults = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);

    const [attemptRes, answersRes] = await Promise.all([
      supabase.from('quiz_attempts').select('*').eq('id', quizId).single(),
      supabase.from('quiz_answers').select('*, questions(*)').eq('quiz_attempt_id', quizId).order('created_at'),
    ]);
    setAttempt(attemptRes.data);
    setAnswers(answersRes.data || []);

    // Check if there's already an import code for this quiz
    const { data: existingCode } = await supabase
      .from('shared_quiz_codes')
      .select('import_code')
      .eq('quiz_attempt_id', quizId)
      .single();
    if (existingCode) setImportCode(existingCode.import_code);

    setLoading(false);
  };

  const loadFriends = async () => {
    if (!user) return;
    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const friendIds = (friendships || []).map(f =>
      f.user_id === user.id ? f.friend_id : f.user_id
    );

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, friend_code')
        .in('id', friendIds);
      setFriends(profiles || []);
    }
  };

  const handleOpenShare = async () => {
    setShowShareModal(true);
    await loadFriends();
  };

  const handleShareToFriends = async () => {
    if (selectedFriends.length === 0) return;
    setSharing(true);

    try {
      const questionIds = answers.map(a => a.question_id);
      const mailEntries = selectedFriends.map(friendId => ({
        sender_id: user.id,
        recipient_id: friendId,
        quiz_attempt_id: quizId,
        question_ids: questionIds,
        subject_name: attempt?.scope || '',
        scope: attempt?.scope || 'unit',
        message: shareMessage.trim() || null,
      }));

      const { error } = await supabase.from('quiz_mail').insert(mailEntries);
      if (error) throw error;

      setShareSuccess(true);
      setTimeout(() => {
        setShowShareModal(false);
        setShareSuccess(false);
        setSelectedFriends([]);
        setShareMessage('');
      }, 2000);
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleGenerateImportCode = async () => {
    setGeneratingCode(true);
    try {
      const questionIds = answers.map(a => a.question_id);
      const code = 'QZ-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error } = await supabase.from('shared_quiz_codes').insert({
        creator_id: user.id,
        quiz_attempt_id: quizId,
        question_ids: questionIds,
        import_code: code,
        subject_name: attempt?.scope || '',
        scope: attempt?.scope || 'unit',
        total_questions: questionIds.length,
      });

      if (error) throw error;
      setImportCode(code);
    } catch (err) {
      console.error('Generate code error:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyImportCode = () => {
    navigator.clipboard.writeText(importCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const toggleFriend = (id) => {
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto"><div className="h-48 rounded-2xl animate-shimmer mb-6" /><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl animate-shimmer" />)}</div></div>;
  }

  if (!attempt) {
    return <div className="text-center py-16"><p style={{ color: 'var(--muted-foreground)' }}>Quiz not found.</p></div>;
  }

  const pct = attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0;
  const correct = answers.filter(a => a.is_correct).length;
  const incorrect = answers.filter(a => !a.is_correct && a.user_answer).length;
  const unanswered = answers.filter(a => !a.user_answer).length;
  const needsReview = answers.filter(a => !a.is_correct);
  const timeSpent = formatTime(attempt.time_spent_seconds);
  const timerDuration = formatTime(attempt.timer_duration_seconds);

  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Score Card */}
      <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="inline-block relative mb-6">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="56" fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle
              cx="70" cy="70" r="56" fill="none"
              stroke={pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)'}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>{pct}%</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2" style={{ color: 'var(--foreground)' }}>
          {pct >= 80 ? <><Confetti weight="fill" className="text-[var(--primary)]" /> Excellent!</> : pct >= 60 ? <><ThumbsUp weight="fill" className="text-[var(--success)]" /> Good job!</> : pct >= 40 ? <><Books weight="fill" className="text-[var(--warning)]" /> Keep studying!</> : <><Barbell weight="fill" className="text-[var(--danger)]" /> Don't give up!</>}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
          You scored {attempt.score} out of {attempt.total_questions}
        </p>

        <div className="flex justify-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{correct}</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Correct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>{incorrect}</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Incorrect</p>
          </div>
          {unanswered > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--muted-foreground)' }}>{unanswered}</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Skipped</p>
            </div>
          )}
          {timeSpent && (
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{timeSpent}</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {timerDuration ? `Time (of ${timerDuration})` : 'Time Spent'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center flex-wrap">
        <Link href="/quiz/start" className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
          Take Another Quiz
        </Link>
        <button
          onClick={handleOpenShare}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold hover-lift cursor-pointer"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--secondary))', color: '#fff' }}
        >
          <span className="flex items-center gap-1.5"><TrayArrowUp weight="fill" size={18} /> Share with Friends</span>
        </button>
        <Link href="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold border hover-lift" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          Back to Dashboard
        </Link>
      </div>

      {/* Import Code Section */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
          <span className="flex items-center gap-1.5"><LinkIcon weight="bold" size={18} /> Quiz Import Code</span>
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
          Generate a unique code anyone can use to take this same quiz — no friendship needed.
        </p>
        {importCode ? (
          <div className="flex items-center gap-3">
            <div
              className="px-5 py-2.5 rounded-xl text-lg font-mono font-bold tracking-widest"
              style={{
                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
                border: '2px dashed var(--accent)',
              }}
            >
              {importCode}
            </div>
            <button
              onClick={copyImportCode}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${codeCopied ? 'copy-flash' : ''}`}
              style={{
                background: codeCopied ? 'var(--success)' : 'var(--accent)',
                color: '#fff',
              }}
            >
              {codeCopied ? <span className="flex items-center gap-1.5"><Check weight="bold" size={16} /> Copied!</span> : <span className="flex items-center gap-1.5"><ClipboardText weight="fill" size={16} /> Copy</span>}
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateImportCode}
            disabled={generatingCode}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {generatingCode ? 'Generating...' : <span className="flex items-center gap-1.5"><Sparkle weight="fill" size={16} /> Generate Import Code</span>}
          </button>
        )}
      </div>

      {/* Answer Review */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>Question Review</h2>
        <div className="space-y-4">
          {answers.map((answer, i) => {
            const q = answer.questions;
            if (!q) return null;

            return (
              <div
                key={answer.id}
                className={`rounded-2xl border p-5 animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                style={{
                  background: 'var(--card)',
                  borderColor: answer.is_correct ? 'var(--success)' : 'var(--danger)',
                  borderLeftWidth: '4px',
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{
                    background: answer.is_correct ? 'color-mix(in srgb, var(--success) 15%, transparent)' : 'color-mix(in srgb, var(--danger) 15%, transparent)',
                    color: answer.is_correct ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {answer.is_correct ? <Check weight="bold" /> : <X weight="bold" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <TypeBadge type={q.type} />
                      <DifficultyBadge difficulty={q.difficulty} />
                    </div>
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                      {i + 1}. {q.question_text}
                    </p>

                    {/* MC choices */}
                    {q.type === 'multiple_choice' && q.choices && (
                      <div className="space-y-1.5 mb-3">
                        {q.choices.map((choice, ci) => {
                          const correctAnswers = q.correct_answer ? q.correct_answer.split('|||').map(a => a.trim()) : [];
                          const userAnswers = answer.user_answer ? answer.user_answer.split('|||').map(a => a.trim()) : [];

                          const isUserChoice = userAnswers.includes(choice);
                          const isCorrectChoice = correctAnswers.includes(choice);

                          let bg = 'var(--muted)';
                          let color = 'var(--muted-foreground)';
                          let weight = '400';

                          if (isCorrectChoice && isUserChoice) {
                            bg = 'color-mix(in srgb, var(--success) 10%, transparent)';
                            color = 'var(--success)';
                            weight = '600';
                          } else if (isCorrectChoice && !isUserChoice) {
                            bg = 'color-mix(in srgb, var(--success) 5%, transparent)';
                            color = 'var(--success)';
                            weight = '600';
                          } else if (!isCorrectChoice && isUserChoice) {
                            bg = 'color-mix(in srgb, var(--danger) 10%, transparent)';
                            color = 'var(--danger)';
                            weight = '600';
                          }

                          return (
                            <div key={ci} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{
                              background: bg,
                              color: color,
                              fontWeight: weight,
                            }}>
                              <span>{String.fromCharCode(65 + ci)}.</span>
                              <span>{choice}</span>
                              {isCorrectChoice && <span className="ml-auto flex items-center gap-1"><Check weight="bold" /> Correct</span>}
                              {isUserChoice && !isCorrectChoice && <span className="ml-auto flex items-center gap-1"><X weight="bold" /> Your answer</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Written answer comparison */}
                    {q.type === 'written' && (
                      <div className="space-y-2 mb-3">
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted-foreground)' }}>Your Answer:</p>
                          <p className="text-xs p-2 rounded-lg" style={{ background: 'var(--muted)', color: answer.user_answer ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                            {answer.user_answer || '(no answer)'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--success)' }}>Sample Answer:</p>
                          <p className="text-xs p-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--success) 5%, transparent)', color: 'var(--foreground)' }}>
                            {q.correct_answer}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* AI Feedback */}
                    {answer.ai_feedback && (
                      <div className="p-3 rounded-lg mb-2" style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}>
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: 'var(--accent)' }}><Robot weight="fill" size={16} /> AI Feedback</p>
                        <p className="text-xs" style={{ color: 'var(--foreground)' }}>{answer.ai_feedback}</p>
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-3 rounded-lg" style={{ background: 'var(--muted)' }}>
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}><Lightbulb weight="fill" size={16} style={{ color: 'var(--warning)' }} /> Explanation</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Questions to Review */}
      {needsReview.length > 0 && (
        <div className="rounded-2xl border p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Notepad weight="fill" size={20} className="text-[var(--primary)]" /> Questions to Review ({needsReview.length})
          </h2>
          <div className="space-y-2">
            {needsReview.map((a) => (
              <div key={a.id} className="p-3 rounded-xl text-sm" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
                {a.questions?.question_text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowShareModal(false)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 rounded-2xl border p-6 animate-scale-in"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            {shareSuccess ? (
              <div className="text-center py-8">
                <span className="mb-3 flex justify-center text-[var(--success)]"><CheckCircle weight="fill" size={48} /></span>
                <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Quiz Shared!</p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Your friends will find it in their inbox.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                  <span className="flex items-center gap-1.5"><TrayArrowUp weight="fill" size={20} className="text-[var(--primary)]" /> Share Quiz with Friends</span>
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
                  Select friends to send this quiz to. They&apos;ll get it in their inbox.
                </p>

                {/* Friend list */}
                <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                  {friends.length === 0 ? (
                    <p className="text-sm py-4 text-center" style={{ color: 'var(--muted-foreground)' }}>
                      No friends yet. Add friends to share quizzes!
                    </p>
                  ) : (
                    friends.map(f => (
                      <button
                        key={f.id}
                        onClick={() => toggleFriend(f.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                        style={{
                          background: selectedFriends.includes(f.id) ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--muted)',
                          border: selectedFriends.includes(f.id) ? '2px solid var(--primary)' : '2px solid transparent',
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{
                            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                            color: 'var(--primary-foreground)',
                          }}
                        >
                          {f.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--foreground)' }}>
                          {f.full_name || 'Unknown'}
                        </span>
                        {selectedFriends.includes(f.id) && (
                          <span className="text-[var(--primary)]"><Check weight="bold" size={16} /></span>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Optional message */}
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a message (optional)..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none mb-4"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShareToFriends}
                    disabled={sharing || selectedFriends.length === 0}
                    className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                  >
                    {sharing ? 'Sending...' : `Send to ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
