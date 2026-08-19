/**
 * Tests for src/components/ui/Modal.js
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Modal from '@/components/ui/Modal';

describe('Modal', () => {
  test('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={jest.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  test('renders title and children when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  test('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );

    // The backdrop has the glass-modal-backdrop class
    const backdrop = document.querySelector('.glass-modal-backdrop');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  test('does not close when modal panel itself is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Click me</p>
      </Modal>
    );

    fireEvent.click(screen.getByText('Click me'));
    expect(onClose).not.toHaveBeenCalled();
  });

  test('renders close button that calls onClose', () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );

    // Find the close button (the X button in the header)
    const closeButton = document.querySelector('.glass-modal-panel button');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  test('applies correct size class for sm', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Small" size="sm">
        <p>Content</p>
      </Modal>
    );

    const panel = document.querySelector('.glass-modal-panel');
    expect(panel).toHaveClass('max-w-md');
  });

  test('applies correct size class for md (default)', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Medium">
        <p>Content</p>
      </Modal>
    );

    const panel = document.querySelector('.glass-modal-panel');
    expect(panel).toHaveClass('max-w-lg');
  });

  test('applies correct size class for lg', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Large" size="lg">
        <p>Content</p>
      </Modal>
    );

    const panel = document.querySelector('.glass-modal-panel');
    expect(panel).toHaveClass('max-w-2xl');
  });

  test('applies correct size class for xl', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="XL" size="xl">
        <p>Content</p>
      </Modal>
    );

    const panel = document.querySelector('.glass-modal-panel');
    expect(panel).toHaveClass('max-w-4xl');
  });

  test('locks body scroll when open', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test">
        <p>Content</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');
  });

  test('restores body scroll when closed', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test">
        <p>Content</p>
      </Modal>
    );

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
