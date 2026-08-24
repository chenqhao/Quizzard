'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase-browser';
import { Fire } from '@phosphor-icons/react/dist/ssr/Fire';
import { CalendarBlank } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Target } from '@phosphor-icons/react/dist/ssr/Target';
import { Timer } from '@phosphor-icons/react/dist/ssr/Timer';
import { ChartBar } from '@phosphor-icons/react/dist/ssr/ChartBar';
import { TrendUp } from '@phosphor-icons/react/dist/ssr/TrendUp';
import { Books } from '@phosphor-icons/react/dist/ssr/Books';

// ── Helpers ──────────────────────────────────────────────────────
function formatTime(seconds) {
  if (!seconds || seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// ── Heatmap intensity colors ────────────────────────────────────
const HEATMAP_COLORS = {
  light: [
    '#ebedf0', // 0 — empty
    '#9be9a8', // 1
    '#40c463', // 2
    '#30a14e', // 3
    '#216e39', // 4+
  ],
  dark: [
    '#161b22', // 0
    '#0e4429', // 1
    '#006d32', // 2
    '#26a641', // 3
    '#39d353', // 4+
  ],
};

function getLevel(count) {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

// ── Main Component ──────────────────────────────────────────────
export default function ProgressPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [activityMap, setActivityMap] = useState({});
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalCorrect: 0,
    totalQuizzes: 0,
    totalTime: 0,
    currentStreak: 0,
    longestStreak: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [subjectBreakdown, setSubjectBreakdown] = useState([]);
  const [tooltip, setTooltip] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const heatmapRef = useRef(null);

  // Detect dark mode
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      // Fetch all quiz attempts
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('id, score, total_questions, time_spent_seconds, completed_at, unit_id')
        .order('completed_at', { ascending: true });

      if (!attempts || attempts.length === 0) {
        setLoading(false);
        return;
      }

      // ── Build activity map (last 365 days) ──
      const map = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      attempts.forEach((a) => {
        if (!a.completed_at) return;
        const key = a.completed_at.slice(0, 10);
        map[key] = (map[key] || 0) + (a.total_questions || 1);
      });
      setActivityMap(map);

      // ── Aggregate stats ──
      let totalQuestions = 0;
      let totalCorrect = 0;
      let totalTime = 0;
      attempts.forEach((a) => {
        totalQuestions += a.total_questions || 0;
        totalCorrect += a.score || 0;
        totalTime += a.time_spent_seconds || 0;
      });

      // ── Streaks ──
      const activeDays = new Set(Object.keys(map));
      let currentStreak = 0;
      let longestStreak = 0;
      let streak = 0;

      // Check from today backwards
      for (let i = 0; i < 365; i++) {
        const d = daysAgo(i);
        const key = dateKey(d);
        if (activeDays.has(key)) {
          streak++;
          if (i === 0 || streak > 0) currentStreak = streak;
        } else {
          if (i === 0) {
            currentStreak = 0;
          }
          if (streak > longestStreak) longestStreak = streak;
          streak = 0;
        }
      }
      if (streak > longestStreak) longestStreak = streak;

      // Recalculate current streak more carefully
      let cs = 0;
      for (let i = 0; i < 365; i++) {
        const key = dateKey(daysAgo(i));
        if (activeDays.has(key)) {
          cs++;
        } else if (i === 0) {
          // Today no activity, still check from yesterday
          continue;
        } else {
          break;
        }
      }

      setStats({
        totalQuestions,
        totalCorrect,
        totalQuizzes: attempts.length,
        totalTime,
        currentStreak: cs,
        longestStreak: Math.max(longestStreak, cs),
      });

      // ── Monthly trend (last 6 months) ──
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const count = attempts.filter(
          (a) => a.completed_at && a.completed_at.startsWith(yearMonth)
        ).length;
        months.push({
          label: MONTH_LABELS[d.getMonth()],
          count,
        });
      }
      setMonthlyTrend(months);

      // ── Subject breakdown ──
      const unitIds = [...new Set(attempts.filter((a) => a.unit_id).map((a) => a.unit_id))];
      if (unitIds.length > 0) {
        const { data: units } = await supabase
          .from('units')
          .select('id, title, course_id, courses(name, course_code, subject_id, subjects(name, color))')
          .in('id', unitIds);

        const subjectMap = {};
        attempts.forEach((a) => {
          if (!a.unit_id) return;
          const unit = units?.find((u) => u.id === a.unit_id);
          if (!unit || !unit.courses?.subjects) return;
          const subjectId = unit.courses.subject_id;
          const subjectName = unit.courses.subjects.name;
          const subjectColor = unit.courses.subjects.color || 'var(--primary)';
          if (!subjectMap[subjectId]) {
            subjectMap[subjectId] = { name: subjectName, color: subjectColor, total: 0, correct: 0 };
          }
          subjectMap[subjectId].total += a.total_questions || 0;
          subjectMap[subjectId].correct += a.score || 0;
        });

        setSubjectBreakdown(
          Object.values(subjectMap).sort((a, b) => b.total - a.total)
        );
      }
    } catch (err) {
      console.error('Progress load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Build heatmap grid data (52 weeks × 7 days) ──
  const buildHeatmapGrid = () => {
    const weeks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDay = today.getDay(); // 0=Sun..6=Sat

    // We start from (52*7 + todayDay) days ago to fill 53 columns ending on today
    const totalDays = 52 * 7 + todayDay + 1;
    const startDate = daysAgo(totalDays - 1);

    let currentWeek = [];
    const monthMarkers = [];
    let lastMonth = -1;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      const count = activityMap[key] || 0;
      const level = getLevel(count);
      const dayOfWeek = d.getDay();

      // Track month changes for labels
      if (d.getMonth() !== lastMonth) {
        monthMarkers.push({ weekIndex: Math.floor(i / 7), label: MONTH_LABELS[d.getMonth()] });
        lastMonth = d.getMonth();
      }

      currentWeek.push({ date: d, key, count, level, dayOfWeek });

      if (dayOfWeek === 6 || i === totalDays - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return { weeks, monthMarkers };
  };

  const { weeks, monthMarkers } = buildHeatmapGrid();
  const colors = isDark ? HEATMAP_COLORS.dark : HEATMAP_COLORS.light;
  const accuracy = stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0;
  const maxMonthly = Math.max(...monthlyTrend.map((m) => m.count), 1);

  // ── Total activity in last year ──
  const totalActivity = Object.values(activityMap).reduce((sum, v) => sum + v, 0);

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-56 rounded-2xl animate-shimmer" />
        <div className="h-40 rounded-2xl animate-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 rounded-2xl animate-shimmer" />
          ))}
        </div>
        <div className="h-48 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1
          className="text-3xl lg:text-4xl font-bold tracking-tight"
          style={{ color: 'var(--foreground)' }}
        >
          Progress
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          {totalActivity > 0
            ? `${totalActivity.toLocaleString()} questions answered in the last year`
            : 'Start studying to track your progress!'}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ACTIVITY HEATMAP
          ══════════════════════════════════════════════════════════ */}
      <div className="bento-card" style={{ overflow: 'visible' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Study Activity
          </h2>
          {/* Legend */}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span>Less</span>
            {colors.map((c, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: c,
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Heatmap grid — table-based layout for alignment */}
        <div ref={heatmapRef} style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <table
            style={{
              borderCollapse: 'separate',
              borderSpacing: 3,
              margin: '0 auto',
            }}
          >
            {/* Month labels row */}
            <thead>
              <tr>
                <td style={{ width: 30 }} />{/* Spacer for day labels */}
                {weeks.map((_, wi) => {
                  const marker = monthMarkers.find((m) => m.weekIndex === wi);
                  // Don't show if too close to previous
                  const prevMarker = monthMarkers.find(
                    (m, mi) => mi < monthMarkers.indexOf(marker) && marker && marker.weekIndex - m.weekIndex < 3
                  );
                  return (
                    <td
                      key={wi}
                      style={{
                        fontSize: 11,
                        color: 'var(--muted-foreground)',
                        paddingBottom: 4,
                        textAlign: 'left',
                        fontWeight: 500,
                      }}
                    >
                      {marker && !prevMarker ? marker.label : ''}
                    </td>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* One row per day of week (0=Sun .. 6=Sat) */}
              {Array.from({ length: 7 }).map((_, dayOfWeek) => (
                <tr key={dayOfWeek}>
                  {/* Day label */}
                  <td
                    style={{
                      fontSize: 11,
                      color: 'var(--muted-foreground)',
                      textAlign: 'right',
                      paddingRight: 6,
                      width: 30,
                      fontWeight: 500,
                    }}
                  >
                    {DAY_LABELS[dayOfWeek]}
                  </td>
                  {/* Cells for this day across all weeks */}
                  {weeks.map((week, wi) => {
                    const cell = week.find((d) => d.dayOfWeek === dayOfWeek);
                    if (!cell) {
                      return <td key={wi} style={{ width: 13, height: 13 }} />;
                    }
                    const isToday = cell.key === dateKey(new Date());
                    return (
                      <td
                        key={wi}
                        onMouseMove={(e) => {
                          setTooltip({
                            x: e.clientX,
                            y: e.clientY - 16,
                            text: `${cell.count} question${cell.count !== 1 ? 's' : ''} on ${cell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onMouseOver={(e) => {
                          e.currentTarget.firstChild.style.transform = 'scale(1.5)';
                          e.currentTarget.firstChild.style.boxShadow = '0 0 6px rgba(0,0,0,0.25)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.firstChild.style.transform = 'scale(1)';
                          e.currentTarget.firstChild.style.boxShadow = 'none';
                        }}
                        style={{ padding: 0 }}
                      >
                        <div
                          style={{
                            width: 13,
                            height: 13,
                            borderRadius: 3,
                            background: colors[cell.level],
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            outline: isToday ? '2px solid var(--primary)' : 'none',
                            outlineOffset: -1,
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════
          STATS BENTO GRID
          ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            label: 'Current Streak',
            value: `${stats.currentStreak}`,
            unit: stats.currentStreak === 1 ? 'day' : 'days',
            color: 'var(--danger)',
            icon: <Fire weight="fill" />,
          },
          {
            label: 'Longest Streak',
            value: `${stats.longestStreak}`,
            unit: stats.longestStreak === 1 ? 'day' : 'days',
            color: 'var(--warning)',
            icon: <CalendarBlank weight="fill" />,
          },
          {
            label: 'Questions Answered',
            value: stats.totalQuestions.toLocaleString(),
            unit: '',
            color: 'var(--primary)',
            icon: <CheckCircle weight="fill" />,
          },
          {
            label: 'Accuracy',
            value: `${accuracy}`,
            unit: '%',
            color: 'var(--success)',
            icon: <Target weight="fill" />,
          },
          {
            label: 'Study Time',
            value: formatTime(stats.totalTime),
            unit: '',
            color: 'var(--secondary)',
            icon: <Timer weight="fill" />,
          },
          {
            label: 'Quizzes Taken',
            value: stats.totalQuizzes.toLocaleString(),
            unit: '',
            color: 'var(--accent)',
            icon: <ChartBar weight="fill" />,
          },
        ].map((card, i) => (
          <div
            key={card.label}
            className={`bento-card animate-fade-in stagger-${i + 1}`}
            style={{ opacity: 0, animationFillMode: 'forwards' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
                style={{
                  background: `color-mix(in srgb, ${card.color} 10%, transparent)`,
                }}
              >
                {card.icon}
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              {card.value}
              {card.unit && (
                <span className="text-sm font-medium ml-1" style={{ color: 'var(--muted-foreground)' }}>
                  {card.unit}
                </span>
              )}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MONTHLY TREND + SUBJECT BREAKDOWN
          ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Trend */}
        <div className="bento-card">
          <h2 className="text-lg font-bold tracking-tight mb-5" style={{ color: 'var(--foreground)' }}>
            Monthly Activity
          </h2>
          {monthlyTrend.length === 0 || monthlyTrend.every((m) => m.count === 0) ? (
            <div className="py-8 text-center">
              <span className="mb-3 flex justify-center text-[var(--muted-foreground)] opacity-50"><TrendUp weight="regular" size={48} /></span>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Take quizzes to see your monthly trends.
              </p>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-3" style={{ height: 140 }}>
              {monthlyTrend.map((month, i) => {
                const heightPct = maxMonthly > 0 ? (month.count / maxMonthly) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: month.count > 0 ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                    >
                      {month.count}
                    </span>
                    <div
                      className="w-full rounded-xl transition-all duration-700 ease-out"
                      style={{
                        height: `${Math.max(heightPct, 4)}%`,
                        background:
                          month.count === maxMonthly
                            ? 'linear-gradient(to top, var(--primary), var(--secondary))'
                            : 'color-mix(in srgb, var(--primary) 20%, transparent)',
                        minHeight: 4,
                      }}
                    />
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {month.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subject Breakdown */}
        <div className="bento-card">
          <h2 className="text-lg font-bold tracking-tight mb-5" style={{ color: 'var(--foreground)' }}>
            By Subject
          </h2>
          {subjectBreakdown.length === 0 ? (
            <div className="py-8 text-center">
              <span className="mb-3 flex justify-center text-[var(--muted-foreground)] opacity-50"><Books weight="regular" size={48} /></span>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Complete quizzes across subjects to see your breakdown.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {subjectBreakdown.map((subject) => {
                const pct = subject.total > 0 ? Math.round((subject.correct / subject.total) * 100) : 0;
                return (
                  <div key={subject.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: subject.color }}
                        />
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          {subject.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {subject.total} Q&apos;s
                        </span>
                        <span
                          className="text-sm font-bold px-2 py-0.5 rounded-lg"
                          style={{
                            color: pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)',
                            background: `color-mix(in srgb, ${pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'} 10%, transparent)`,
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--border)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: subject.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    {tooltip && typeof document !== 'undefined' && createPortal(
      <div
        style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: 'var(--foreground)',
          color: 'var(--background)',
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        {tooltip.text}
      </div>,
      document.body
    )}
    </>
  );
}
