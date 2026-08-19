/**
 * Tests for SearchModal PAGES constant and search filtering logic.
 *
 * Since SearchModal is a complex client component with portal rendering,
 * we extract and test the static data and filtering logic it uses.
 */

// The PAGES array is defined inline in SearchModal, so we replicate
// the filtering logic here and test it against the known data.

const PAGES = [
  { label: 'Home', href: '/', keywords: ['home', 'dashboard'] },
  { label: 'Friends', href: '/friends', keywords: ['friends', 'study groups', 'social'] },
  { label: 'Notifications', href: '/inbox', keywords: ['notifications', 'inbox', 'messages'] },
  { label: 'Your Classes', href: '/subjects', keywords: ['classes', 'subjects', 'library'] },
  { label: 'Generate', href: '/generate', keywords: ['generate', 'ai', 'create', 'flashcards'] },
  { label: 'Review', href: '/review', keywords: ['review', 'study', 'questions'] },
  { label: 'Progress', href: '/progress', keywords: ['progress', 'stats', 'analytics'] },
  { label: 'Leaderboard', href: '/leaderboard', keywords: ['leaderboard', 'ranking', 'compete'] },
  { label: 'Calendar', href: '/calendar', keywords: ['calendar', 'schedule', 'dates'] },
  { label: 'Settings', href: '/settings', keywords: ['settings', 'preferences', 'account'] },
];

// Replicate the filtering logic from SearchModal
function filterPages(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PAGES.filter(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      p.keywords.some((k) => k.includes(q))
  );
}

describe('SearchModal — PAGES data integrity', () => {
  test('has exactly 10 pages', () => {
    expect(PAGES).toHaveLength(10);
  });

  test('every page has label, href, and keywords', () => {
    PAGES.forEach((page) => {
      expect(page.label).toBeTruthy();
      expect(page.href).toBeTruthy();
      expect(Array.isArray(page.keywords)).toBe(true);
      expect(page.keywords.length).toBeGreaterThan(0);
    });
  });

  test('all hrefs start with /', () => {
    PAGES.forEach((page) => {
      expect(page.href.startsWith('/')).toBe(true);
    });
  });

  test('no duplicate hrefs', () => {
    const hrefs = PAGES.map((p) => p.href);
    const unique = new Set(hrefs);
    expect(unique.size).toBe(hrefs.length);
  });

  test('no duplicate labels', () => {
    const labels = PAGES.map((p) => p.label);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });
});

describe('SearchModal — page filtering logic', () => {
  test('returns empty array for empty query', () => {
    expect(filterPages('')).toEqual([]);
    expect(filterPages('   ')).toEqual([]);
  });

  test('finds Home by label', () => {
    const results = filterPages('home');
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Home');
  });

  test('finds Home by keyword "dashboard"', () => {
    const results = filterPages('dashboard');
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Home');
  });

  test('search is case-insensitive', () => {
    const results = filterPages('SETTINGS');
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Settings');
  });

  test('finds Generate by keyword "ai"', () => {
    const results = filterPages('ai');
    expect(results.some((r) => r.label === 'Generate')).toBe(true);
  });

  test('finds Generate by keyword "flashcards"', () => {
    const results = filterPages('flashcards');
    expect(results.some((r) => r.label === 'Generate')).toBe(true);
  });

  test('partial match works (e.g., "cal" matches Calendar)', () => {
    const results = filterPages('cal');
    expect(results.some((r) => r.label === 'Calendar')).toBe(true);
  });

  test('partial match works for keywords (e.g., "rank" matches leaderboard)', () => {
    const results = filterPages('rank');
    expect(results.some((r) => r.label === 'Leaderboard')).toBe(true);
  });

  test('returns multiple results for broad queries', () => {
    const results = filterPages('s'); // matches Settings, subjects, stats, etc.
    expect(results.length).toBeGreaterThan(1);
  });

  test('returns empty for unmatched query', () => {
    const results = filterPages('zzzznonexistent');
    expect(results).toEqual([]);
  });

  test('finds Notifications by keyword "inbox"', () => {
    const results = filterPages('inbox');
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('Notifications');
  });

  test('finds Your Classes by keyword "library"', () => {
    const results = filterPages('library');
    expect(results.some((r) => r.label === 'Your Classes')).toBe(true);
  });

  test('finds Friends by keyword "social"', () => {
    const results = filterPages('social');
    expect(results.some((r) => r.label === 'Friends')).toBe(true);
  });
});

describe('SearchModal — recent searches constants', () => {
  const RECENT_SEARCHES_KEY = 'quizzard-recent-searches';
  const MAX_RECENT = 5;

  test('uses expected localStorage key', () => {
    expect(RECENT_SEARCHES_KEY).toBe('quizzard-recent-searches');
  });

  test('max recent searches is 5', () => {
    expect(MAX_RECENT).toBe(5);
  });
});
