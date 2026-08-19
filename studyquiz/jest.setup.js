import '@testing-library/jest-dom';

// ── Mock next/navigation ────────────────────────────────────
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
    back: mockBack,
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// ── Mock next/link ──────────────────────────────────────────
jest.mock('next/link', () => {
  const React = require('react');
  return React.forwardRef(function MockLink({ children, href, ...props }, ref) {
    return React.createElement('a', { href, ref, ...props }, children);
  });
});

// ── IntersectionObserver polyfill ────────────────────────────
class MockIntersectionObserver {
  constructor() {
    this.observe = jest.fn();
    this.unobserve = jest.fn();
    this.disconnect = jest.fn();
  }
}
global.IntersectionObserver = MockIntersectionObserver;

// ── ResizeObserver polyfill ──────────────────────────────────
class MockResizeObserver {
  constructor() {
    this.observe = jest.fn();
    this.unobserve = jest.fn();
    this.disconnect = jest.fn();
  }
}
global.ResizeObserver = MockResizeObserver;

// ── matchMedia polyfill ──────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ── localStorage mock (jsdom has one, but reset between tests) ──
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});
