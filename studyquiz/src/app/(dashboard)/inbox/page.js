'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { Warning } from '@phosphor-icons/react/dist/ssr/Warning';
import { Check } from '@phosphor-icons/react/dist/ssr/Check';
import { TrayArrowDown } from '@phosphor-icons/react/dist/ssr/TrayArrowDown';
import { EnvelopeOpen } from '@phosphor-icons/react/dist/ssr/EnvelopeOpen';
import { TrayArrowUp } from '@phosphor-icons/react/dist/ssr/TrayArrowUp';
import { Tray } from '@phosphor-icons/react/dist/ssr/Tray';
import { Target } from '@phosphor-icons/react/dist/ssr/Target';
import { RocketLaunch } from '@phosphor-icons/react/dist/ssr/RocketLaunch';

function InboxContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('received');
  const [receivedMail, setReceivedMail] = useState([]);
  const [sentMail, setSentMail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [importCode, setImportCode] = useState(searchParams.get('code') || '');
  const [importing, setImporting] = useState(false);

  useEffect(() => { loadMail(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadMail = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);

      // Load received mail with sender profiles
      const { data: received } = await supabase
        .from('quiz_mail')
        .select('*')
        .eq('recipient_id', u.id)
        .order('created_at', { ascending: false });

      // Load sent mail
      const { data: sent } = await supabase
        .from('quiz_mail')
        .select('*')
        .eq('sender_id', u.id)
        .order('created_at', { ascending: false });

      // Get all profile IDs we need
      const senderIds = [...new Set((received || []).map(m => m.sender_id))];
      const recipientIds = [...new Set((sent || []).map(m => m.recipient_id))];
      const allIds = [...new Set([...senderIds, ...recipientIds])];

      let profileMap = {};
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, friend_code')
          .in('id', allIds);
        profiles?.forEach(p => { profileMap[p.id] = p; });
      }

      setReceivedMail((received || []).map(m => ({
        ...m,
        senderProfile: profileMap[m.sender_id] || {},
      })));

      setSentMail((sent || []).map(m => ({
        ...m,
        recipientProfile: profileMap[m.recipient_id] || {},
      })));
    } catch (err) {
      console.error('Load mail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeQuiz = async (mail) => {
    try {
      const questionIds = mail.question_ids || [];
      if (questionIds.length === 0) {
        showMessage('No questions in this shared quiz.', 'error');
        return;
      }

      // Create a new quiz attempt
      const { data: attempt } = await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        scope: mail.scope || 'unit',
        score: 0,
        total_questions: questionIds.length,
      }).select().single();

      // Store question IDs in sessionStorage
      sessionStorage.setItem(`quiz-${attempt.id}`, JSON.stringify(questionIds));

      // Mark mail as read
      if (!mail.is_read) {
        await supabase.from('quiz_mail').update({ is_read: true }).eq('id', mail.id);
      }

      router.push(`/quiz/${attempt.id}`);
    } catch (err) {
      console.error('Take quiz error:', err);
      showMessage('Failed to start quiz.', 'error');
    }
  };

  const handleImportByCode = async () => {
    const code = importCode.trim().toUpperCase();
    if (!code) return;
    setImporting(true);

    try {
      const { data: shared, error } = await supabase
        .from('shared_quiz_codes')
        .select('*')
        .eq('import_code', code)
        .single();

      if (error || !shared) {
        showMessage('No quiz found with that import code.', 'error');
        setImporting(false);
        return;
      }

      const questionIds = shared.question_ids || [];
      if (questionIds.length === 0) {
        showMessage('This shared quiz has no questions.', 'error');
        setImporting(false);
        return;
      }

      // Create a new quiz attempt
      const { data: attempt } = await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        scope: shared.scope || 'unit',
        score: 0,
        total_questions: questionIds.length,
      }).select().single();

      // Store question IDs
      sessionStorage.setItem(`quiz-${attempt.id}`, JSON.stringify(questionIds));

      // Increment import counter
      await supabase
        .from('shared_quiz_codes')
        .update({ times_imported: (shared.times_imported || 0) + 1 })
        .eq('id', shared.id);

      router.push(`/quiz/${attempt.id}`);
    } catch (err) {
      console.error('Import error:', err);
      showMessage('Failed to import quiz.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteMail = async (mailId) => {
    try {
      await supabase.from('quiz_mail').delete().eq('id', mailId);
      showMessage('Mail deleted.');
      loadMail();
    } catch (err) {
      showMessage('Failed to delete.', 'error');
    }
  };

  const unreadCount = receivedMail.filter(m => !m.is_read).length;

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="h-8 w-48 rounded-lg animate-shimmer" />
        <div className="h-32 rounded-2xl animate-shimmer" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          Inbox
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Receive shared quizzes from friends or import quizzes by code.
        </p>
      </div>

      {/* Toast */}
      {message && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium animate-scale-in flex items-center gap-2"
          style={{
            background: message.type === 'error'
              ? 'color-mix(in srgb, var(--danger) 12%, transparent)'
              : 'color-mix(in srgb, var(--success) 12%, transparent)',
            color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
            border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
          }}
        >
          {message.type === 'error' ? <Warning weight="fill" size={16} /> : <Check weight="bold" size={16} />}
          {message.text}
        </div>
      )}

      {/* Import by Code */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
          <TrayArrowDown weight="fill" size={20} className="text-[var(--primary)]" /> Import Quiz by Code
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
          Paste a quiz import code to take someone else&apos;s quiz — no friendship required.
        </p>
        <div className="flex gap-3">
          <input
            id="import-code-input"
            type="text"
            value={importCode}
            onChange={(e) => setImportCode(e.target.value.toUpperCase())}
            placeholder="QZ-XXXXXX"
            className="flex-1 px-4 py-3 rounded-xl border text-sm font-mono tracking-wider outline-none transition-all"
            style={{
              background: 'var(--muted)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            onKeyDown={(e) => e.key === 'Enter' && handleImportByCode()}
          />
          <button
            id="import-quiz-btn"
            onClick={handleImportByCode}
            disabled={importing || !importCode.trim()}
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--primary))',
              color: '#fff',
            }}
          >
            {importing ? 'Importing...' : 'Import & Start'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex rounded-xl p-1 border"
        style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'received' ? 'shadow-sm' : 'hover:bg-[var(--border)]'
          }`}
          style={{
            background: activeTab === 'received' ? 'var(--card)' : 'transparent',
            color: activeTab === 'received' ? 'var(--foreground)' : 'var(--muted-foreground)',
          }}
        >
          <EnvelopeOpen weight="fill" size={18} /> Received
          {unreadCount > 0 && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold badge-pulse"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'sent' ? 'shadow-sm' : 'hover:bg-[var(--border)]'
          }`}
          style={{
            background: activeTab === 'sent' ? 'var(--card)' : 'transparent',
            color: activeTab === 'sent' ? 'var(--foreground)' : 'var(--muted-foreground)',
          }}
        >
          <TrayArrowUp weight="fill" size={18} /> Sent
        </button>
      </div>

      {/* Mail List */}
      <div className="space-y-3">
        {activeTab === 'received' && (
          receivedMail.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="text-center py-12">
                <span className="mb-3 flex justify-center text-[var(--muted-foreground)] opacity-50"><Tray weight="regular" size={48} /></span>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  No received quizzes yet. Ask friends to share their quizzes!
                </p>
              </div>
            </div>
          ) : (
            receivedMail.map((mail, i) => (
              <div
                key={mail.id}
                className={`rounded-2xl border p-5 transition-all hover-lift animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                style={{
                  background: mail.is_read ? 'var(--card)' : 'color-mix(in srgb, var(--primary) 4%, var(--card))',
                  borderColor: mail.is_read ? 'var(--border)' : 'var(--primary)',
                  borderWidth: mail.is_read ? '1px' : '2px',
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Sender Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      color: 'var(--primary-foreground)',
                    }}
                  >
                    {mail.senderProfile?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        {mail.senderProfile?.full_name || 'Unknown'}
                      </p>
                      {!mail.is_read && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: 'var(--primary)' }}
                        />
                      )}
                      <span className="text-xs ml-auto" style={{ color: 'var(--muted-foreground)' }}>
                        {new Date(mail.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs font-medium flex items-center gap-1.5 mb-2 mt-1" style={{ color: 'var(--foreground)' }}>
                      <Target weight="fill" size={14} className="text-[var(--accent)]" /> Shared a quiz — {(mail.question_ids || []).length} questions
                      {mail.subject_name && (
                        <span style={{ color: 'var(--muted-foreground)' }}> • {mail.subject_name}</span>
                      )}
                    </p>

                    {mail.message && (
                      <p className="text-xs mb-3 italic" style={{ color: 'var(--muted-foreground)' }}>
                        &quot;{mail.message}&quot;
                      </p>
                    )}

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleTakeQuiz(mail)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                          color: '#fff',
                        }}
                      >
                        <span className="flex items-center gap-1.5"><RocketLaunch weight="fill" size={16} /> Take Quiz</span>
                      </button>
                      <button
                        onClick={() => handleDeleteMail(mail.id)}
                        className="px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'sent' && (
          sentMail.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="text-center py-12">
                <span className="mb-3 flex justify-center text-[var(--muted-foreground)] opacity-50"><TrayArrowUp weight="regular" size={48} /></span>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  No quizzes sent yet. Share a quiz from your results page!
                </p>
              </div>
            </div>
          ) : (
            sentMail.map((mail, i) => (
              <div
                key={mail.id}
                className={`rounded-2xl border p-5 transition-all animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border)',
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                  >
                    {mail.recipientProfile?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                        To: {mail.recipientProfile?.full_name || 'Unknown'}
                      </p>
                      <span className="text-xs ml-auto" style={{ color: 'var(--muted-foreground)' }}>
                        {new Date(mail.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {(mail.question_ids || []).length} questions
                      {mail.subject_name && ` • ${mail.subject_name}`}
                    </p>
                    {mail.message && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--muted-foreground)' }}>
                        &quot;{mail.message}&quot;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="h-10 w-64 mx-auto rounded-lg animate-shimmer" />}>
      <InboxContent />
    </Suspense>
  );
}
