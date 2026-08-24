/**
 * Tests for src/proxy.js (middleware)
 *
 * Tests the auth-routing logic: redirects for unauthenticated users,
 * redirects for authenticated users on auth pages, and public path passthrough.
 */
import { NextResponse } from 'next/server';

// Mock the Supabase SSR server client
const mockGetSession = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
    },
  })),
}));

// Mock NextResponse
jest.mock('next/server', () => {
  const redirect = jest.fn((url) => ({ type: 'redirect', url: url.toString() }));
  const next = jest.fn(({ request } = {}) => ({
    type: 'next',
    cookies: {
      set: jest.fn(),
    },
  }));

  return {
    NextResponse: { redirect, next },
  };
});

import { proxy } from '@/proxy';

// Helper to create a mock request
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

describe('proxy middleware', () => {
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

  // ── Unauthenticated users ──────────────────────────────────

  test('redirects unauthenticated user from / to /login', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const result = await proxy(createMockRequest('/'));

    expect(result.type).toBe('redirect');
    expect(NextResponse.redirect).toHaveBeenCalled();
    const redirectUrl = NextResponse.redirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/login');
  });

  test('redirects unauthenticated user from /subjects to /login', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const result = await proxy(createMockRequest('/subjects'));

    expect(result.type).toBe('redirect');
    const redirectUrl = NextResponse.redirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/login');
  });

  // ── Public paths passthrough for unauthenticated ───────────

  test('allows unauthenticated user to access /login', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const result = await proxy(createMockRequest('/login'));

    expect(result.type).toBe('next');
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  test('allows unauthenticated user to access /signup', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const result = await proxy(createMockRequest('/signup'));

    expect(result.type).toBe('next');
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  test('allows unauthenticated user to access /auth/callback', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });

    const result = await proxy(createMockRequest('/auth/callback'));

    expect(result.type).toBe('next');
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  // ── Authenticated users ────────────────────────────────────

  test('allows authenticated user to access /', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1', email: 'test@test.com' } } },
    });

    const result = await proxy(createMockRequest('/'));

    expect(result.type).toBe('next');
  });

  test('redirects authenticated user from /login to /', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1', email: 'test@test.com' } } },
    });

    const result = await proxy(createMockRequest('/login'));

    expect(result.type).toBe('redirect');
    const redirectUrl = NextResponse.redirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/');
  });

  test('redirects authenticated user from /signup to /', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1', email: 'test@test.com' } } },
    });

    const result = await proxy(createMockRequest('/signup'));

    expect(result.type).toBe('redirect');
    const redirectUrl = NextResponse.redirect.mock.calls[0][0];
    expect(redirectUrl.pathname).toBe('/');
  });

  test('allows authenticated user to access /subjects', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-1', email: 'test@test.com' } } },
    });

    const result = await proxy(createMockRequest('/subjects'));

    expect(result.type).toBe('next');
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
