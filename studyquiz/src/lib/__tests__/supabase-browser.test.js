/**
 * Tests for src/lib/supabase-browser.js
 *
 * Verifies the singleton pattern and that env vars are passed through.
 */

const mockClient = { auth: { getUser: jest.fn() } };

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => mockClient),
}));

describe('supabase-browser createClient', () => {
  beforeEach(() => {
    jest.resetModules();
    // Re-mock after module reset
    jest.mock('@supabase/ssr', () => ({
      createBrowserClient: jest.fn(() => mockClient),
    }));
  });

  test('returns a client object', async () => {
    const { createClient } = await import('@/lib/supabase-browser');
    const client = createClient();
    expect(client).toBeDefined();
    expect(client).toBe(mockClient);
  });

  test('returns the same singleton instance on repeated calls', async () => {
    const { createClient } = await import('@/lib/supabase-browser');
    const client1 = createClient();
    const client2 = createClient();
    expect(client1).toBe(client2);
  });

  test('passes env variables to createBrowserClient', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const { createBrowserClient } = require('@supabase/ssr');
    const { createClient } = await import('@/lib/supabase-browser');
    createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    );
  });
});
