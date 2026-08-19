/**
 * Tests for src/components/ui/Breadcrumb.js
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Breadcrumb from '@/components/ui/Breadcrumb';

describe('Breadcrumb', () => {
  test('returns null when items is undefined', () => {
    const { container } = render(<Breadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  test('returns null when items is an empty array', () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders a single item as plain text (not a link)', () => {
    render(<Breadcrumb items={[{ label: 'Home' }]} />);
    const item = screen.getByText('Home');
    expect(item).toBeInTheDocument();
    expect(item.tagName).not.toBe('A');
    expect(item.tagName).toBe('SPAN');
  });

  test('renders multiple items with links for non-last items', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Subjects', href: '/subjects' },
          { label: 'Math' },
        ]}
      />
    );

    const homeLink = screen.getByText('Home');
    expect(homeLink.tagName).toBe('A');
    expect(homeLink).toHaveAttribute('href', '/');

    const subjectsLink = screen.getByText('Subjects');
    expect(subjectsLink.tagName).toBe('A');
    expect(subjectsLink).toHaveAttribute('href', '/subjects');

    const mathText = screen.getByText('Math');
    expect(mathText.tagName).toBe('SPAN');
  });

  test('renders chevron separators between items', () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Subjects', href: '/subjects' },
          { label: 'Math' },
        ]}
      />
    );

    // Should have 2 separator SVGs (between 3 items)
    const separators = container.querySelectorAll('svg');
    expect(separators).toHaveLength(2);
  });

  test('renders item without href as span even if not last', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'No Link' },
          { label: 'Last Item' },
        ]}
      />
    );

    // First item has no href, so it should be a span
    const noLink = screen.getByText('No Link');
    expect(noLink.tagName).toBe('SPAN');
  });

  test('has aria-label for accessibility', () => {
    render(
      <Breadcrumb items={[{ label: 'Home', href: '/' }]} />
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  });
});
