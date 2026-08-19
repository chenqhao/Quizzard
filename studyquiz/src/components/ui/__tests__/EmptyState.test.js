/**
 * Tests for src/components/ui/EmptyState.js
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import EmptyState from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  test('renders title and description', () => {
    render(
      <EmptyState
        icon={<svg data-testid="test-icon" />}
        title="No items found"
        description="Try adding some items to get started."
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('Try adding some items to get started.')).toBeInTheDocument();
  });

  test('renders the icon', () => {
    render(
      <EmptyState
        icon={<svg data-testid="test-icon" />}
        title="Empty"
        description="Nothing here"
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  test('renders action when provided', () => {
    render(
      <EmptyState
        icon={<svg />}
        title="Empty"
        description="Nothing here"
        action={<button>Add Item</button>}
      />
    );

    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  test('does not render action section when action is undefined', () => {
    const { container } = render(
      <EmptyState
        icon={<svg />}
        title="Empty"
        description="Nothing here"
      />
    );

    // No button should be present
    expect(container.querySelector('button')).toBeNull();
  });

  test('applies animate-fade-in class', () => {
    const { container } = render(
      <EmptyState
        icon={<svg />}
        title="Empty"
        description="Nothing here"
      />
    );

    expect(container.firstChild).toHaveClass('animate-fade-in');
  });
});
