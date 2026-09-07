// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DraggablePiece } from './DraggablePiece';
import { createPieces } from './engine';
import { PIECE_SCALE } from './geometry';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup() {
  const board = document.createElement('div');
  board.getBoundingClientRect = () => new DOMRect(200, 100, 300, 300);
  const onPlace = vi.fn();
  const onSelect = vi.fn();
  const view = render(
    <DraggablePiece
      piece={createPieces(3)[0]!}
      size={3}
      imageUrl="/test.svg"
      boardRef={{ current: board }}
      selected={false}
      onSelect={onSelect}
      onPlace={onPlace}
      snapThreshold={0.65}
    />,
  );
  const button = screen.getByRole('button', { name: 'Кусочек 1' });
  button.getBoundingClientRect = () => new DOMRect(0, 500, 100, 100);
  return { button, onPlace, onSelect, ...view };
}
const pointer = { pointerId: 1, isPrimary: true, pointerType: 'touch', button: 0 };
function start(button: HTMLElement) {
  fireEvent.pointerDown(button, { ...pointer, clientX: 50, clientY: 550 });
}

describe('pointer drag lifecycle', () => {
  it('snaps near the right cell and suppresses the click following a drag', () => {
    const { button, onPlace, onSelect } = setup();
    start(button);
    expect(document.querySelector('.drag-ghost')).not.toBeNull();
    const sourceClip = button.querySelector('clipPath')!.id;
    const ghost = document.querySelector('.drag-ghost')!;
    const ghostClip = ghost.querySelector('clipPath')!.id;
    expect(ghostClip).not.toBe(sourceClip);
    expect(ghost.querySelector('g')!.getAttribute('clip-path')).toBe(`url(#${ghostClip})`);
    expect(ghost.querySelector('image')!.getAttribute('href')).toBe('/test.svg');
    fireEvent.pointerMove(button, { ...pointer, clientX: 265, clientY: 155 });
    fireEvent.pointerUp(button, { ...pointer, clientX: 265, clientY: 155 });
    fireEvent.click(button, { detail: 1 });
    expect(onPlace).toHaveBeenCalledExactlyOnceWith(0);
    expect(onSelect).not.toHaveBeenCalled();
    expect(document.querySelector('.drag-ghost')).toBeNull();
  });
  it('anchors a grab on the protruding tab to the logical cell center', () => {
    const { button, onPlace } = setup();
    // Grab off-center in the padded artwork. The same point arrives off-center at the board.
    const fraction = 0.86;
    fireEvent.pointerDown(button, { ...pointer, clientX: fraction * 100, clientY: 550 });
    expect((document.querySelector('.drag-ghost') as HTMLElement).style.width).toBe(
      `${100 * PIECE_SCALE}px`,
    );
    fireEvent.pointerUp(button, {
      ...pointer,
      clientX: 250 + (fraction - 0.5) * 100 * PIECE_SCALE,
      clientY: 150,
    });
    expect(onPlace).toHaveBeenCalledExactlyOnceWith(0);
  });
  it('returns a wrong piece and restores its source after the animation', () => {
    const { button, onPlace } = setup();
    start(button);
    fireEvent.pointerMove(button, { ...pointer, clientX: 350, clientY: 150 });
    vi.advanceTimersByTime(64);
    fireEvent.pointerUp(button, { ...pointer, clientX: 350, clientY: 150 });
    expect(onPlace).not.toHaveBeenCalled();
    expect(document.querySelector('.drag-ghost')).not.toBeNull();
    vi.advanceTimersByTime(1000);
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(button.classList.contains('drag-source')).toBe(false);
  });
  it('cancels an interrupted touch without placing the piece', () => {
    const { button, onPlace } = setup();
    start(button);
    fireEvent.pointerCancel(button, pointer);
    expect(onPlace).not.toHaveBeenCalled();
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(button.classList.contains('drag-source')).toBe(false);
  });
  it('restores a returning piece when the viewport changes', () => {
    const { button } = setup();
    start(button);
    fireEvent.pointerUp(button, { ...pointer, clientX: 350, clientY: 150 });
    fireEvent(window, new Event('resize'));
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(button.classList.contains('drag-source')).toBe(false);
  });
  it('ignores additional fingers and removes overlays on unmount', () => {
    const { button, unmount } = setup();
    start(button);
    fireEvent.pointerDown(button, { ...pointer, pointerId: 2, isPrimary: false });
    expect(document.querySelectorAll('.drag-ghost')).toHaveLength(1);
    unmount();
    expect(document.querySelector('.drag-ghost')).toBeNull();
  });
  it('supports tap and keyboard selection without moving a piece', () => {
    const { button, onSelect, onPlace } = setup();
    start(button);
    fireEvent.pointerUp(button, { ...pointer, clientX: 50, clientY: 550 });
    fireEvent.click(button, { detail: 1 });
    fireEvent.click(button, { detail: 0 });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onPlace).not.toHaveBeenCalled();
  });
  it('uses the finger position for snapping while the spring is still catching up', () => {
    const { button, onPlace } = setup();
    start(button);
    fireEvent.pointerMove(button, { ...pointer, clientX: 190, clientY: 150 });
    vi.advanceTimersByTime(16);
    fireEvent.pointerUp(button, { ...pointer, clientX: 190, clientY: 150 });
    expect(onPlace).toHaveBeenCalledExactlyOnceWith(0);
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('removes spring, tilt and animated return when reduced motion is enabled', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { button, onPlace } = setup();
    start(button);
    fireEvent.pointerMove(button, { ...pointer, clientX: 350, clientY: 150 });
    const ghost = document.querySelector('.drag-ghost') as HTMLElement;
    expect(ghost.style.transform).toContain('translate3d(272.000px,72.000px,0)');
    expect(ghost.style.transform).toContain('rotateZ(0.000deg) scale(1.0000)');
    fireEvent.pointerUp(button, { ...pointer, clientX: 350, clientY: 150 });
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(onPlace).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
