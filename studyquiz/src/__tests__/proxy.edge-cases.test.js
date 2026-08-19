/**
 * Additional edge-case tests for src/proxy.js (middleware)
 *
 * Covers session errors, sub-paths, and boundary conditions
 * not covered in the primary proxy test file.
 */
import { NextResponse } from 'next/server';

const mockGetSession = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
  })),
}));

jest.mock('next/server', () => {
  const redirect = jest.fn((url) => ({ type: 'redirect', url: url.toString() }));
  const next = jest.fn(() => ({
    type: 'next',
    cookies: { set: jest.fn() },
  }));
  return { NextResponse: { redirect, next } };
});

import { proxy, config } from '@/proxy';

function createMockRequest(pathname) {
  const url = new URL(`http://localhost:3000${pathname}`);
  return {
    nextUrl: {
      pathname,
      clone: () => {
        const cloned = new URL(url);
        return {
          get pathname() { return cloned.pathname; },
          set pathname(v) { cloned.pathname = v; },
          toString() { return cloned.toString(); },
        };
      },
    },
    cookies: {
      getAll: jest.fn(() => []),
      set: jest.fn(),
    },
  };
}

describe('proxy middleware — edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NextResponse.redirect.mockImplementation((url) => ({
      type: 'redirect',
      url: url.toString?.() || url,
    }));
    NextResponse.next.mockImplementation(() => ({
      type: 'next',
      cookies: { set: jest.fn() },
    }));
  });

  // ── Sub-paths of public routes ──────────────────────────────

  test('allows unauthenticated access to /auth/callback sub-paths', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await proxy(createMockRequest('/auth/callback?code=abc123'));
    expect(result.type).toBe('next');
  });

  test('allows unauthenticated access to /login sub-path', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    // /login with query params
    const result = await proxy(createMockRequest('/login?error=auth_error'));
    expect(result.type).toBe('next');
  });

  // ── Protected route sub-paths ──────────────────────────────

  test('redirects unauthenticated user from /settings to /login', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await proxy(createMockRequest('/settings'));
    expect(result.type).toBe('redirect');
    const redirectUrl = NextResponse.redirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/login');
  });

  test('redirects unauthenticated user from /quiz/start to /login', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await proxy(createMockRequest('/quiz/start'));
    expect(result.type).toBe('redirect');
  });

  test('redirects unauthenticated user from /generate to /login', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await proxy(createMockRequest('/generate'));
    expect(result.type).toBe('redirect');
  });

  test('redirects unauthenticated user from /review to /login', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await proxy(createMockRequest('/review'));
    expect(result.type).toBe('redirect');
  });

  test('redirects unauthenticated user from deeply nested route', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await proxy(createMockRequest('/subjects/abc/courses/def/units/ghi'));
    expect(result.type).toBe('redirect');
  });

  // ── Authenticated user on protected routes ─────────────────

  test('allows authenticated user to access /generate', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u1', email: 'test@test.com' } } },
    });

    const result = await proxy(createMockRequest('/generate'));
    expect(result.type).toBe('next');
  });

  test('allows authenticated user to access /quiz/start', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'u1', email: 'test@test.com' } } },
    });

    const result = await proxy(createMockRequest('/quiz/start'));
    expect(result.type).toBe('next');
  });

  // ── Session with undefined user ────────────────────────────

  test('redirects when session exists but user is undefined', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: undefined } },
    });

    const result = await proxy(createMockRequest('/'));
    // session.user is undefined → falsy → redirect to login
    expect(result.type).toBe('redirect');
  });

  test('redirects when session is null', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const result = await proxy(createMockRequest('/progress'));
    expect(result.type).toBe('redirect');
  });
});

describe('proxy config (matcher)', () => {
  test('exports a matcher config', () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher.length).toBeGreaterThan(0);
  });

  test('matcher pattern excludes static assets', () => {
    // The regex pattern should exclude .svg, .png, .jpg, etc.
    // Next.js matchers are implicitly anchored, so we add ^ and $ for standard RegExp
    const pattern = new RegExp('^' + config.matcher[0] + '$');
    expect(pattern.test('/_next/static/chunk.js')).toBe(false);
    expect(pattern.test('/favicon.ico')).toBe(false);
  });
});
