/**
 * Tests for src/components/ui/Badge.js
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge, DifficultyBadge, TypeBadge, MasteryBadge } from '@/components/ui/Badge';

describe('Badge', () => {
  test('renders children text', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  test('applies default variant styling', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.firstChild;
    expect(badge.style.color).toContain('var(--muted-foreground)');
  });

  test('applies primary variant styling', () => {
    const { container } = render(<Badge variant="primary">Primary</Badge>);
    const badge = container.firstChild;
    expect(badge.style.color).toContain('var(--primary)');
  });

  test('applies success variant styling', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.firstChild;
    expect(badge.style.color).toContain('var(--success)');
  });

  test('applies danger variant styling', () => {
    const { container } = render(<Badge variant="danger">Danger</Badge>);
    const badge = container.firstChild;
    expect(badge.style.color).toContain('var(--danger)');
  });

  test('applies warning variant styling', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const badge = container.firstChild;
    expect(badge.style.color).toContain('var(--warning)');
  });

  test('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('applies custom inline style', () => {
    const { container } = render(<Badge style={{ fontSize: '16px' }}>Styled</Badge>);
    expect(container.firstChild.style.fontSize).toBe('16px');
  });

  test('falls back to default for unknown variant', () => {
    const { container } = render(<Badge variant="nonexistent">Unknown</Badge>);
    const badge = container.firstChild;
    expect(badge.style.color).toContain('var(--muted-foreground)');
  });
});

describe('DifficultyBadge', () => {
  test('renders "Easy" with success variant', () => {
    render(<DifficultyBadge difficulty="easy" />);
    const badge = screen.getByText('Easy');
    expect(badge).toBeInTheDocument();
    expect(badge.style.color).toContain('var(--success)');
  });

  test('renders "Medium" with warning variant', () => {
    render(<DifficultyBadge difficulty="medium" />);
    const badge = screen.getByText('Medium');
    expect(badge).toBeInTheDocument();
    expect(badge.style.color).toContain('var(--warning)');
  });

  test('renders "Hard" with danger variant', () => {
    render(<DifficultyBadge difficulty="hard" />);
    const badge = screen.getByText('Hard');
    expect(badge).toBeInTheDocument();
    expect(badge.style.color).toContain('var(--danger)');
  });

  test('handles uppercase input', () => {
    render(<DifficultyBadge difficulty="EASY" />);
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  test('falls back to medium for unknown difficulty', () => {
    render(<DifficultyBadge difficulty="unknown" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });
});

describe('TypeBadge', () => {
  test('renders "MC" for multiple_choice', () => {
    render(<TypeBadge type="multiple_choice" />);
    const badge = screen.getByText('MC');
    expect(badge).toBeInTheDocument();
    expect(badge.style.color).toContain('var(--primary)');
  });

  test('renders "Written" for written type', () => {
    render(<TypeBadge type="written" />);
    const badge = screen.getByText('Written');
    expect(badge).toBeInTheDocument();
    expect(badge.style.color).toContain('var(--secondary)');
  });
});

describe('MasteryBadge', () => {
  test('renders "New" for new status', () => {
    render(<MasteryBadge status="new" />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  test('renders "Mastered" with success variant', () => {
    render(<MasteryBadge status="mastered" />);
    const badge = screen.getByText('Mastered');
    expect(badge).toBeInTheDocument();
    expect(badge.style.color).toContain('var(--success)');
  });

  test('renders "Needs Review" with warning variant', () => {
    render(<MasteryBadge status="needs_review" />);
    const badge = screen.getByText('Needs Review');
    expect(badge).toBeInTheDocument();
    expect(badge.style.color).toContain('var(--warning)');
  });

  test('renders "Hard" with danger variant', () => {
    render(<MasteryBadge status="hard" />);
    const badge = screen.getByText('Hard');
    expect(badge).toBeInTheDocument();
    expect(badge.style.color).toContain('var(--danger)');
  });

  test('falls back to "New" for unknown status', () => {
    render(<MasteryBadge status="unknown_status" />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });
});
