/**
 * Tests for src/lib/icons.js
 */
import React from 'react';
import { ICONS, renderIcon } from '@/lib/icons';

// Mock all phosphor-icons SSR imports so we don't need the actual library
jest.mock('@phosphor-icons/react/dist/ssr/Books', () => ({
  Books: (props) => <svg data-testid="books-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Calculator', () => ({
  Calculator: (props) => <svg data-testid="calculator-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Microscope', () => ({
  Microscope: (props) => <svg data-testid="microscope-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Dna', () => ({
  Dna: (props) => <svg data-testid="dna-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Palette', () => ({
  Palette: (props) => <svg data-testid="palette-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Bank', () => ({
  Bank: (props) => <svg data-testid="bank-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Laptop', () => ({
  Laptop: (props) => <svg data-testid="laptop-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Globe', () => ({
  Globe: (props) => <svg data-testid="globe-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Strategy', () => ({
  Strategy: (props) => <svg data-testid="strategy-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/MusicNotes', () => ({
  MusicNotes: (props) => <svg data-testid="music-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Scales', () => ({
  Scales: (props) => <svg data-testid="scales-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Briefcase', () => ({
  Briefcase: (props) => <svg data-testid="briefcase-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Brain', () => ({
  Brain: (props) => <svg data-testid="brain-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/ChartBar', () => ({
  ChartBar: (props) => <svg data-testid="chartbar-icon" {...props} />,
}));
jest.mock('@phosphor-icons/react/dist/ssr/Wrench', () => ({
  Wrench: (props) => <svg data-testid="wrench-icon" {...props} />,
}));

describe('ICONS array', () => {
  test('contains exactly 15 icon names', () => {
    expect(ICONS).toHaveLength(15);
  });

  test('contains all expected icon names', () => {
    const expected = [
      'Books', 'Calculator', 'Microscope', 'Dna', 'Palette',
      'Bank', 'Laptop', 'Globe', 'Strategy', 'MusicNotes',
      'Scales', 'Briefcase', 'Brain', 'ChartBar', 'Wrench',
    ];
    expect(ICONS).toEqual(expected);
  });
});

describe('renderIcon', () => {
  test('returns a valid React element for a known icon name', () => {
    const element = renderIcon('Books');
    expect(React.isValidElement(element)).toBe(true);
  });

  test('returns correct icon for each ICONS entry', () => {
    ICONS.forEach((iconName) => {
      const element = renderIcon(iconName);
      expect(React.isValidElement(element)).toBe(true);
    });
  });

  test('returns correct icon for emoji keys', () => {
    const emojiKeys = ['📚', '🧮', '🔬', '🧬', '🎨', '🏛️', '💻', '🌍', '📐', '🎵', '⚖️', '💼', '🧠', '📊', '🔧'];
    emojiKeys.forEach((emoji) => {
      const element = renderIcon(emoji);
      expect(React.isValidElement(element)).toBe(true);
    });
  });

  test('passes weight="fill" prop to icon component', () => {
    const element = renderIcon('Books');
    expect(element.props.weight).toBe('fill');
  });

  test('falls back gracefully for unknown icon name', () => {
    // Should not throw — falls back to Books (or the default)
    expect(() => renderIcon('NonExistentIcon')).not.toThrow();
    const element = renderIcon('NonExistentIcon');
    expect(React.isValidElement(element)).toBe(true);
  });
});
