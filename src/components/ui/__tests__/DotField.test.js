/**
 * Tests for DotField component (src/components/ui/DotField.js)
 *
 * DotField is a canvas-based component — we test that it renders
 * a canvas element and accepts its props without errors.
 */
import React from 'react';
import { render } from '@testing-library/react';

// Mock the canvas context since jsdom doesn't have canvas
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    setTransform: jest.fn(),
    fillStyle: '',
    globalAlpha: 1,
    canvas: { width: 800, height: 600 },
  }));
});

// DotField uses requestAnimationFrame, mock it
beforeEach(() => {
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    // Don't actually call the callback to prevent infinite loops
    return 1;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  window.requestAnimationFrame.mockRestore();
  window.cancelAnimationFrame.mockRestore();
});

// Import after mocks
import DotField from '@/components/ui/DotField';

describe('DotField', () => {
  test('renders a canvas element', () => {
    const { container } = render(<DotField />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  test('renders without crashing with default props', () => {
    expect(() => render(<DotField />)).not.toThrow();
  });

  test('renders without crashing with custom props', () => {
    expect(() =>
      render(
        <DotField
          dotRadius={2}
          dotSpacing={16}
          bulgeStrength={50}
          glowRadius={120}
          sparkle={true}
          waveAmplitude={5}
          gradientFrom="rgba(255, 0, 0, 0.5)"
          gradientTo="rgba(0, 0, 255, 0.5)"
          glowColor="#ffffff"
        />
      )
    ).not.toThrow();
  });

  test('cleans up animation frame on unmount', () => {
    const { unmount } = render(<DotField />);
    unmount();
    // Should have called cancelAnimationFrame during cleanup
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
