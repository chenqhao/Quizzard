'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

const icons = {
  lightning: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  library: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  book: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  check: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
};

export default function Dashboard() {
  const [stats, setStats] = useState({ subjects: 0, questions: 0 });
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [weakUnits, setWeakUnits] = useState([]);
  const [jumpBackItems, setJumpBackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [subjectsRes, questionsRes, quizzesRes] = await Promise.all([
          supabase.from('subjects').select('id', { count: 'exact', head: true }),
          supabase.from('questions').select('id', { count: 'exact', head: true }),
          supabase.from('quiz_attempts').select('*').order('completed_at', { ascending: false }).limit(5),
        ]);

        setStats({
          subjects: subjectsRes.count || 0,
          questions: questionsRes.count || 0,
        });

        if (quizzesRes.data && quizzesRes.data.length > 0) {
          const quizIds = [...new Set(quizzesRes.data.map(q => q.quiz_id))];
          const { data: quizDetails } = await supabase
            .from('quizzes')
            .select('id, title, target_type, target_id')
            .in('id', quizIds);

          const quizzesMap = {};
          quizDetails?.forEach(q => { quizzesMap[q.id] = q; });

          const mapped = quizzesRes.data.map(attempt => ({
            ...attempt,
            quiz: quizzesMap[attempt.quiz_id] || { title: 'Unknown Quiz' }
          }));

          setRecentQuizzes(mapped);
        }

        // Load weak units
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('unit_id, score, total_questions')
          .not('unit_id', 'is', null);

        if (attempts && attempts.length > 0) {
          const unitScores = {};
          attempts.forEach((a) => {
            if (!unitScores[a.unit_id]) unitScores[a.unit_id] = { total: 0, correct: 0, count: 0 };
            unitScores[a.unit_id].total += a.total_questions;
            unitScores[a.unit_id].correct += a.score;
            unitScores[a.unit_id].count += 1;
          });

          const weakIds = Object.entries(unitScores)
            .map(([id, s]) => ({ id, avg: s.total > 0 ? (s.correct / s.total) * 100 : 0 }))
            .sort((a, b) => a.avg - b.avg)
            .slice(0, 3);

          if (weakIds.length > 0) {
            const { data: units } = await supabase
              .from('units')
              .select('id, title, course_id, courses(name, course_code)')
              .in('id', weakIds.map((w) => w.id));

            setWeakUnits(
              weakIds.map((w) => {
                const unit = units?.find((u) => u.id === w.id);
                return { ...w, title: unit?.title, courseName: unit?.courses?.course_code || unit?.courses?.name };
              }).filter((w) => w.title)
            );
          }
        }

        // Quick Jump Back
        const { data: recentSubjects } = await supabase
          .from('subjects')
          .select('id, name, color')
          .order('updated_at', { ascending: false })
          .limit(4);

        if (recentSubjects && recentSubjects.length > 0) {
          setJumpBackItems(recentSubjects.map(s => ({
            id: s.id,
            title: s.name,
            color: s.color || 'var(--primary)',
            href: `/subjects`,
            type: 'subject',
          })));
        }

      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="type-title1 mb-1">Welcome back</h1>
          <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>
            Here's what's happening with your studies today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Subjects', value: stats.subjects, icon: icons.library, color: 'var(--primary)', href: '/subjects' },
          { label: 'Questions', value: stats.questions, icon: icons.check, color: 'var(--accent)', href: '/review' },
        ].map((stat, i) => (
          <Link
            href={stat.href}
            key={stat.label}
            className="bento-card rounded-[24px] p-6 hover-lift stagger-1"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-[16px] flex items-center justify-center bento-card-strong"
                style={{ color: stat.color }}
              >
                {stat.icon}
              </div>
            </div>
            <div>
              <p className="type-largeTitle mb-1">{stat.value}</p>
              <p className="type-subhead" style={{ color: 'var(--muted-foreground)' }}>{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/subjects"
          className="bento-card rounded-[20px] p-4 flex items-center gap-4 hover-lift depth-press"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bento-card-strong"
            style={{ color: 'var(--primary)' }}
          >
            {icons.library}
          </div>
          <div>
            <p className="type-subhead font-semibold" style={{ color: 'var(--foreground)' }}>Add Subject</p>
            <p className="type-caption1" style={{ color: 'var(--muted-foreground)' }}>Create a new study subject</p>
          </div>
        </Link>
        <Link
          href="/generate"
          className="bento-card rounded-[20px] p-4 flex items-center gap-4 hover-lift depth-press"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bento-card-strong"
            style={{ color: 'var(--secondary)' }}
          >
            {icons.lightning}
          </div>
          <div>
            <p className="type-subhead font-semibold" style={{ color: 'var(--foreground)' }}>Generate with AI</p>
            <p className="type-caption1" style={{ color: 'var(--muted-foreground)' }}>Create questions from notes</p>
          </div>
        </Link>
        <Link
          href="/review"
          className="bento-card rounded-[20px] p-4 flex items-center gap-4 hover-lift depth-press"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bento-card-strong"
            style={{ color: 'var(--success)' }}
          >
            {icons.check}
          </div>
          <div>
            <p className="type-subhead font-semibold" style={{ color: 'var(--foreground)' }}>Review Questions</p>
            <p className="type-caption1" style={{ color: 'var(--muted-foreground)' }}>Study your saved questions</p>
          </div>
        </Link>
      </div>

      {jumpBackItems.length > 0 && (
        <div className="animate-fade-in">
          <h2 className="section-header mb-4 px-2">Quick Jump Back</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {jumpBackItems.map((item, i) => (
              <Link
                key={item.id}
                href={item.href}
                className={`bento-card rounded-[20px] p-4 flex items-center gap-3 hover-lift depth-press stagger-${i + 1}`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: item.color, boxShadow: `0 0 8px ${item.color}80` }}
                />
                <span className="type-subhead font-medium truncate" style={{ color: 'var(--foreground)' }}>
                  {item.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bento-card rounded-[32px] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="type-title2">Recent Quizzes</h2>
            {recentQuizzes.length > 0 && (
              <Link
                href="/review"
                className="type-footnote font-semibold transition-colors hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                See all
              </Link>
            )}
          </div>

          {recentQuizzes.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bento-card-strong"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {icons.check}
              </div>
              <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>
                No quizzes taken yet. Generate your first one!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentQuizzes.map((quiz) => {
                const percentage = Math.round((quiz.score / quiz.total_questions) * 100);
                const isGood = percentage >= 70;
                return (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-4 rounded-[20px] transition-colors"
                    style={{ background: 'var(--glass-ultra-thin-bg)', border: '0.5px solid var(--glass-ultra-thin-border)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-[14px] flex items-center justify-center type-footnote font-bold"
                        style={{
                          background: `color-mix(in srgb, ${isGood ? 'var(--success)' : 'var(--danger)'} 15%, transparent)`,
                          color: isGood ? 'var(--success)' : 'var(--danger)',
                          border: `0.5px solid color-mix(in srgb, ${isGood ? 'var(--success)' : 'var(--danger)'} 30%, transparent)`,
                        }}
                      >
                        {percentage}%
                      </div>
                      <div>
                        <p className="type-subhead font-semibold">{quiz.quiz.title}</p>
                        <p className="type-caption1 mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                          {new Date(quiz.completed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="type-body font-bold" style={{ color: isGood ? 'var(--success)' : 'var(--danger)' }}>
                      {quiz.score}/{quiz.total_questions}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Needs Attention */}
        <div className="bento-card rounded-[32px] p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="type-title2">Needs Attention</h2>
            {weakUnits.length > 0 && (
              <Link
                href="/review"
                className="type-footnote font-semibold transition-colors hover:underline"
                style={{ color: 'var(--danger)' }}
              >
                Study Now
              </Link>
            )}
          </div>

          {weakUnits.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bento-card-strong"
                style={{ color: 'var(--muted-foreground)' }}
              >
                {icons.library}
              </div>
              <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>
                Take some quizzes to see which units need more study.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {weakUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="p-4 rounded-[20px]"
                  style={{ background: 'var(--glass-ultra-thin-bg)', border: '0.5px solid var(--glass-ultra-thin-border)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="type-subhead font-semibold">{unit.title}</p>
                      <p className="type-caption1 mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{unit.courseName}</p>
                    </div>
                    <span
                      className="type-footnote font-bold px-2.5 py-1 rounded-xl"
                      style={{
                        color: unit.avg < 50 ? 'var(--danger)' : 'var(--warning)',
                        background: `color-mix(in srgb, ${unit.avg < 50 ? 'var(--danger)' : 'var(--warning)'} 15%, transparent)`,
                        border: `0.5px solid color-mix(in srgb, ${unit.avg < 50 ? 'var(--danger)' : 'var(--warning)'} 30%, transparent)`,
                      }}
                    >
                      {Math.round(unit.avg)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--glass-thick-border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${unit.avg}%`,
                        background: unit.avg < 50 ? 'var(--danger)' : 'var(--warning)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
