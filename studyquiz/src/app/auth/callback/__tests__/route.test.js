/**
 * Tests for src/app/auth/callback/route.js
 *
 * Tests the OAuth callback that exchanges an auth code for a session.
 */

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn((url) => ({
      type: 'redirect',
      url: typeof url === 'string' ? url : url.toString(),
    })),
  },
}));

// Mock supabase-server
const mockExchangeCodeForSession = jest.fn();
jest.mock('@/lib/supabase-server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}));

import { GET } from '@/app/auth/callback/route';
import { NextResponse } from 'next/server';

function createRequest(queryString) {
  return {
    url: `http://localhost:3000/auth/callback${queryString}`,
  };
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exchanges code for session and redirects to / on success', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    await GET(createRequest('?code=valid-auth-code'));

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-auth-code');
    expect(NextResponse.redirect).toHaveBeenCalledWith('http://localhost:3000/');
  });

  test('redirects to custom next path on success', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    await GET(createRequest('?code=valid-auth-code&next=/settings'));

    expect(NextResponse.redirect).toHaveBeenCalledWith('http://localhost:3000/settings');
  });

  test('redirects to /login with error when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'Invalid code' },
    });

    await GET(createRequest('?code=invalid-code'));

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/login?error=auth_error'
    );
  });

  test('redirects to /login with error when no code is provided', async () => {
    await GET(createRequest(''));

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/login?error=auth_error'
    );
  });

  test('redirects to /login with error when code is empty string', async () => {
    await GET(createRequest('?code='));

    // empty string is falsy, so no exchange should happen
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/login?error=auth_error'
    );
  });

  test('defaults next to / when not specified', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    await GET(createRequest('?code=abc'));

    expect(NextResponse.redirect).toHaveBeenCalledWith('http://localhost:3000/');
  });
});
