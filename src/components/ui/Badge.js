import React from 'react';

// Liquid Glass generic badge matching original logic
export function Badge({ children, variant = 'default', className = '', style: inlineStyle = {} }) {
  const variants = {
    default: { color: 'var(--muted-foreground)' },
    primary: { color: 'var(--primary)' },
    success: { color: 'var(--success)' },
    danger: { color: 'var(--danger)' },
    warning: { color: 'var(--warning)' },
    secondary: { color: 'var(--secondary)' },
  };

  const selectedColor = variants[variant]?.color || variants.default.color;

  return (
    <span
      className={`glass-badge inline-flex items-center justify-center px-2 py-0.5 rounded-md type-caption2 font-semibold ${className}`}
      style={{
        background: `color-mix(in srgb, ${selectedColor} 15%, var(--glass-ultra-thin-bg))`,
        color: selectedColor,
        border: `0.5px solid color-mix(in srgb, ${selectedColor} 30%, var(--glass-ultra-thin-border))`,
        ...inlineStyle
      }}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }) {
  const map = {
    easy: { variant: 'success', label: 'Easy' },
    medium: { variant: 'warning', label: 'Medium' },
    hard: { variant: 'danger', label: 'Hard' },
  };
  const { variant, label } = map[String(difficulty).toLowerCase()] || map.medium;
  return <Badge variant={variant}>{label}</Badge>;
}

export function TypeBadge({ type }) {
  return (
    <Badge variant={type === 'multiple_choice' ? 'primary' : 'secondary'}>
      {type === 'multiple_choice' ? 'MC' : 'Written'}
    </Badge>
  );
}

export function MasteryBadge({ status }) {
  const map = {
    new: { variant: 'default', label: 'New' },
    mastered: { variant: 'success', label: 'Mastered' },
    needs_review: { variant: 'warning', label: 'Needs Review' },
    hard: { variant: 'danger', label: 'Hard' },
  };
  const { variant, label } = map[String(status).toLowerCase()] || map.new;
  return <Badge variant={variant}>{label}</Badge>;
}
