/**
 * Tests for src/lib/supabase-server.js
 *
 * Covers the server-side Supabase client factory (async cookies).
 */

const mockGetAll = jest.fn(() => []);
const mockSet = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((_url, _key, opts) => {
    // Exercise the cookie handlers so we verify they delegate properly
    opts.cookies.getAll();
    opts.cookies.setAll([
      { name: 'sb-token', value: 'abc', options: { path: '/' } },
    ]);
    return { auth: { getSession: jest.fn() } };
  }),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    getAll: mockGetAll,
    set: mockSet,
  })),
}));

describe('supabase-server createClient', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns a supabase client', async () => {
    const { createClient } = await import('@/lib/supabase-server');
    const client = await createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  test('passes env vars to createServerClient', async () => {
    const { createServerClient } = await import('@supabase/ssr');
    const { createClient } = await import('@/lib/supabase-server');
    await createClient();

    expect(createServerClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      expect.objectContaining({
        cookies: expect.any(Object),
      })
    );
  });

  test('cookie getAll delegates to Next.js cookieStore', async () => {
    const { createClient } = await import('@/lib/supabase-server');
    await createClient();
    expect(mockGetAll).toHaveBeenCalled();
  });

  test('cookie setAll delegates to Next.js cookieStore.set', async () => {
    const { createClient } = await import('@/lib/supabase-server');
    await createClient();
    expect(mockSet).toHaveBeenCalledWith('sb-token', 'abc', { path: '/' });
  });

  test('setAll silently catches errors in Server Components', async () => {
    // Simulate read-only cookie store (Server Component context)
    mockSet.mockImplementationOnce(() => {
      throw new Error('Cookies are read-only');
    });

    const { createClient } = await import('@/lib/supabase-server');

    // Should not throw
    await expect(createClient()).resolves.toBeDefined();
  });
});
