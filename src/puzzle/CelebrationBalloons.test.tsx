// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CelebrationBalloons, CELEBRATION_MS } from './CelebrationBalloons';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const balloons = () => screen.queryAllByRole('button', { name: /^Лопнуть шарик/ });
const bursts = () => document.querySelectorAll('.balloon-burst');

describe('completion balloons', () => {
  it('launches successive balloons and finishes after ten seconds without requiring animation events', () => {
    render(<CelebrationBalloons />);
    expect(balloons()).toHaveLength(0);
    advance(180);
    expect(balloons()).toHaveLength(1);
    advance(5200);
    expect(balloons().length).toBeGreaterThan(6);
    advance(CELEBRATION_MS - 5380);
    expect(screen.queryByRole('group', { name: 'Праздничные шарики' })).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['touch', 'mouse'])(
    'pops immediately with %s and creates only one burst at the balloon',
    (pointerType) => {
      render(<CelebrationBalloons />);
      advance(180);
      const balloon = balloons()[0]!;
      vi.spyOn(balloon, 'getBoundingClientRect').mockReturnValue(new DOMRect(80, 120, 100, 140));
      act(() => {
        fireEvent.pointerDown(balloon, { pointerType, button: 0 });
        fireEvent.click(balloon);
      });
      expect(balloons()).toHaveLength(0);
      expect(bursts()).toHaveLength(1);
      const burst = bursts()[0] as HTMLElement;
      expect(burst.style.left).toBe('130px');
      expect(Number.parseFloat(burst.style.top)).toBeCloseTo(164.8);
      expect(burst.querySelectorAll('i').length).toBeGreaterThan(10);
      advance(1200);
      expect(bursts()).toHaveLength(0);
    },
  );

  it('supports keyboard clicks and ignores the secondary mouse button', () => {
    render(<CelebrationBalloons />);
    advance(180);
    const balloon = balloons()[0]!;
    fireEvent.pointerDown(balloon, { button: 2, pointerType: 'mouse' });
    expect(bursts()).toHaveLength(0);
    expect(balloons()).toHaveLength(1);
    fireEvent.click(balloon, { detail: 0 });
    expect(bursts()).toHaveLength(1);
    expect(balloons()).toHaveLength(0);
  });

  it('cleans up on navigation or restart and can celebrate again under StrictMode', () => {
    const first = render(
      <StrictMode>
        <CelebrationBalloons />
      </StrictMode>,
    );
    advance(1000);
    fireEvent.click(balloons()[0]!);
    first.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(balloons()).toHaveLength(0);
    expect(bursts()).toHaveLength(0);
    render(
      <StrictMode>
        <CelebrationBalloons />
      </StrictMode>,
    );
    advance(180);
    expect(balloons()).toHaveLength(1);
    fireEvent.click(balloons()[0]!);
    expect(bursts()).toHaveLength(1);
  });

  it('keeps a small set of stationary balloons available with reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    render(<CelebrationBalloons />);
    advance(1000);
    expect(balloons()).toHaveLength(6);
    expect(screen.getByRole('group').getAttribute('data-still')).toBe('true');
    fireEvent.click(balloons()[0]!);
    expect(balloons()).toHaveLength(5);
    expect(bursts()).toHaveLength(1);
    advance(9000);
    expect(screen.queryByRole('group')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('lets the last confetti finish falling after the balloons stop', () => {
    render(<CelebrationBalloons />);
    advance(9400);
    fireEvent.click(balloons()[0]!);
    advance(600);
    expect(balloons()).toHaveLength(0);
    expect(bursts()).toHaveLength(1);
    advance(600);
    expect(screen.queryByRole('group')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
