'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ChartBar } from '@phosphor-icons/react/dist/ssr/ChartBar';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Timer } from '@phosphor-icons/react/dist/ssr/Timer';
import { Medal } from '@phosphor-icons/react/dist/ssr/Medal';
import { Trophy } from '@phosphor-icons/react/dist/ssr/Trophy';

const TABS = [
  { key: 'completed', label: 'Questions Completed', icon: <ChartBar weight="fill" size={20} />, description: 'Total questions attempted' },
  { key: 'correct', label: 'Questions Correct', icon: <CheckCircle weight="fill" size={20} />, description: 'Total correct answers' },
  { key: 'time', label: 'Time Spent', icon: <Timer weight="fill" size={20} />, description: 'Total time studying' },
];

function formatTime(seconds) {
  if (!seconds || seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function LeaderboardPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('completed');
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLeaderboard(); }, []);

  const loadLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Get accepted friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = (friendships || []).map(f =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Include self in leaderboard
      const allUserIds = [user.id, ...friendIds];

      // Get profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, friend_code')
        .in('id', allUserIds);

      // Get quiz attempts for all users
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, total_questions, time_spent_seconds')
        .in('user_id', allUserIds);

      // Aggregate stats per user
      const statsMap = {};
      allUserIds.forEach(id => {
        statsMap[id] = { completed: 0, correct: 0, time: 0 };
      });

      (attempts || []).forEach(a => {
        if (statsMap[a.user_id]) {
          statsMap[a.user_id].completed += a.total_questions || 0;
          statsMap[a.user_id].correct += a.score || 0;
          statsMap[a.user_id].time += a.time_spent_seconds || 0;
        }
      });

      // Build leaderboard entries
      const entries = allUserIds.map(id => {
        const profile = profiles?.find(p => p.id === id) || {};
        return {
          id,
          name: profile.full_name || 'Unknown',
          avatar_url: profile.avatar_url,
          friend_code: profile.friend_code,
          ...statsMap[id],
        };
      });

      setLeaderboard(entries);
    } catch (err) {
      console.error('Leaderboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sort by active tab metric
  const sorted = [...leaderboard].sort((a, b) => b[activeTab] - a[activeTab]);
  const maxValue = sorted.length > 0 ? sorted[0][activeTab] : 1;
  const currentTab = TABS.find(t => t.key === activeTab);

  const getRankBadge = (rank) => {
    if (rank === 0) return { icon: <Medal weight="fill" className="text-[#FFD700]" />, bg: 'linear-gradient(135deg, #FFD700, #FFA500)', shadow: '0 4px 12px rgba(255, 215, 0, 0.3)' };
    if (rank === 1) return { icon: <Medal weight="fill" className="text-[#C0C0C0]" />, bg: 'linear-gradient(135deg, #C0C0C0, #A0A0A0)', shadow: '0 4px 12px rgba(192, 192, 192, 0.3)' };
    if (rank === 2) return { icon: <Medal weight="fill" className="text-[#CD7F32]" />, bg: 'linear-gradient(135deg, #CD7F32, #B87333)', shadow: '0 4px 12px rgba(205, 127, 50, 0.3)' };
    return null;
  };

  const getStatDisplay = (entry) => {
    if (activeTab === 'time') return formatTime(entry.time);
    return entry[activeTab].toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 w-48 rounded-lg animate-shimmer" />
        <div className="h-14 rounded-xl animate-shimmer" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          Leaderboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          See how you stack up against your friends.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-xl p-1 border"
        style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer"
            style={{
              background: activeTab === tab.key ? 'var(--card)' : 'transparent',
              color: activeTab === tab.key ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <span className="flex items-center justify-center">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
        Ranked by {currentTab?.description?.toLowerCase()}
      </p>

      {/* Leaderboard */}
      {sorted.length <= 1 ? (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <span className="mb-4 flex justify-center text-[var(--muted-foreground)] opacity-50"><Trophy weight="regular" size={48} /></span>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Add some friends to see the leaderboard!
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Go to the Friends page and add friends by their unique code.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((entry, rank) => {
            const isCurrentUser = entry.id === currentUserId;
            const badge = getRankBadge(rank);
            const percentage = maxValue > 0 ? (entry[activeTab] / maxValue) * 100 : 0;

            return (
              <div
                key={entry.id}
                className={`rounded-2xl border p-4 transition-all duration-300 hover-lift animate-rank-slide stagger-${Math.min(rank + 1, 6)}`}
                style={{
                  background: isCurrentUser
                    ? 'color-mix(in srgb, var(--primary) 6%, var(--card))'
                    : 'var(--card)',
                  borderColor: isCurrentUser ? 'var(--primary)' : 'var(--border)',
                  borderWidth: isCurrentUser ? '2px' : '1px',
                  animationDelay: `${rank * 0.05}s`,
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-10 flex justify-center">
                    {badge ? (
                      <span className="text-2xl">{badge.icon}</span>
                    ) : (
                      <span
                        className="text-lg font-bold"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        #{rank + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover border-2"
                        style={{
                          borderColor: badge ? undefined : 'var(--border)',
                          ...(badge ? { border: `2px solid transparent`, backgroundImage: badge.bg, backgroundClip: 'border-box' } : {}),
                        }}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: isCurrentUser
                            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                            : 'var(--muted)',
                          color: isCurrentUser ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                        }}
                      >
                        {entry.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* Name & Progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                        {entry.name}
                        {isCurrentUser && (
                          <span
                            className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                              color: 'var(--primary)',
                            }}
                          >
                            You
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.max(percentage, 2)}%`,
                          background: rank === 0
                            ? 'linear-gradient(90deg, #FFD700, #FFA500)'
                            : rank === 1
                              ? 'linear-gradient(90deg, #C0C0C0, #A0A0A0)'
                              : rank === 2
                                ? 'linear-gradient(90deg, #CD7F32, #B87333)'
                                : 'linear-gradient(90deg, var(--primary), var(--secondary))',
                        }}
                      />
                    </div>
                  </div>

                  {/* Stat Value */}
                  <div className="flex-shrink-0 text-right">
                    <p
                      className="text-lg font-bold"
                      style={{
                        color: rank < 3 ? 'var(--foreground)' : 'var(--muted-foreground)',
                      }}
                    >
                      {getStatDisplay(entry)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {activeTab === 'completed' ? 'questions' : activeTab === 'correct' ? 'correct' : 'study time'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
