'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';
import { Envelope } from '@phosphor-icons/react/dist/ssr/Envelope';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import DotField from '@/components/ui/DotField';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--background)' }}>
      {/* Interactive Dot Field Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          gradientFrom="rgba(0, 122, 255, 0.6)"
          gradientTo="rgba(88, 86, 214, 0.45)"
          glowColor="#0a0a0f"
        />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'var(--primary-foreground)',
              boxShadow: 'var(--shadow-lg), inset 0 0.5px 0 0 rgba(255,255,255,0.4)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
            </svg>
          </div>
          <h1 className="type-title1 font-bold mb-2">
            {resetMode ? 'Reset Password' : 'Welcome back'}
          </h1>
          <p className="type-body" style={{ color: 'var(--muted-foreground)' }}>
            {resetMode
              ? 'Enter your email to receive a reset link'
              : 'Sign in to your Quizzard account'}
          </p>
        </div>

        <div className="auth-glass-card rounded-[32px] p-8 sm:p-10 shadow-2xl">
          {error && (
            <div
              className="p-4 mb-6 rounded-2xl type-footnote text-center"
              style={{
                background: 'color-mix(in srgb, var(--danger) 15%, transparent)',
                color: 'var(--danger)',
                border: '0.5px solid color-mix(in srgb, var(--danger) 30%, transparent)'
              }}
            >
              {error}
            </div>
          )}

          {resetMode ? (
            resetSent ? (
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                    color: 'var(--success)',
                    border: '0.5px solid color-mix(in srgb, var(--success) 25%, transparent)',
                  }}
                >
                  <Envelope size={28} weight="duotone" />
                </div>
                <div>
                  <p className="type-body font-semibold" style={{ color: 'var(--foreground)' }}>Check your email</p>
                  <p className="type-footnote mt-2" style={{ color: 'var(--muted-foreground)' }}>
                    We sent a password reset link to <strong style={{ color: 'var(--foreground)' }}>{email}</strong>. Click the link in the email to set a new password.
                  </p>
                </div>
                <button
                  onClick={() => { setResetMode(false); setResetSent(false); setError(null); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl type-footnote font-semibold transition-all duration-200 cursor-pointer"
                  style={{ color: 'var(--primary)' }}
                >
                  <ArrowLeft size={16} />
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="type-footnote font-medium px-1" style={{ color: 'var(--foreground)' }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3"
                    placeholder="you@university.edu"
                  />
                </div>
                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3.5 px-4 rounded-xl type-callout font-semibold transition-all duration-300 hover-lift depth-press"
                    style={{
                      background: 'var(--primary)',
                      color: 'var(--primary-foreground)',
                      opacity: resetLoading ? 0.7 : 1,
                      boxShadow: '0 4px 14px 0 color-mix(in srgb, var(--primary) 40%, transparent)',
                    }}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetMode(false); setError(null); }}
                    className="w-full py-2.5 px-4 rounded-xl type-footnote font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <ArrowLeft size={14} />
                    Back to sign in
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="type-footnote font-medium px-1" style={{ color: 'var(--foreground)' }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3"
                  placeholder="you@university.edu"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="type-footnote font-medium px-1" style={{ color: 'var(--foreground)' }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setResetMode(true); setError(null); }}
                    className="type-caption1 font-semibold transition-colors cursor-pointer"
                    style={{ color: 'var(--primary)' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3"
                  placeholder="••••••••"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl type-callout font-semibold transition-all duration-300 hover-lift depth-press"
                  style={{
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 4px 14px 0 color-mix(in srgb, var(--primary) 40%, transparent)',
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-8 text-center type-subhead" style={{ color: 'var(--muted-foreground)' }}>
          Don't have an account?{' '}
          <Link href="/signup" className="font-semibold transition-colors hover:underline" style={{ color: 'var(--primary)' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
