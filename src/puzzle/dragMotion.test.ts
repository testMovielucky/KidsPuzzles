// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDragMotion, stepSpring } from './dragMotion';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup() {
  const ghost = document.createElement('div');
  const motion = createDragMotion(ghost, {
    x: 50,
    y: 50,
    scale: 1,
    size: 100,
    reducedMotion: false,
  });
  return { ghost, motion };
}
function center(ghost: HTMLElement) {
  const values = ghost.style.transform.match(/translate3d\(([-\d.]+)px,([-\d.]+)px/)!;
  return { x: Number(values[1]) + 50, y: Number(values[2]) + 50 };
}

describe('spring card motion', () => {
  it('has the same trajectory at 60 and 120 Hz', () => {
    const slow = { value: 0, velocity: 0 };
    const fast = { value: 0, velocity: 0 };
    for (let frame = 0; frame < 24; frame++) stepSpring(slow, 100, 1 / 60);
    for (let frame = 0; frame < 48; frame++) stepSpring(fast, 100, 1 / 120);
    expect(slow.value).toBeCloseTo(fast.value, 6);
    expect(slow.velocity).toBeCloseTo(fast.velocity, 6);
  });
  it('gently overshoots and settles without diverging after a delayed frame', () => {
    const spring = { value: 0, velocity: 0 };
    let peak = 0;
    stepSpring(spring, 100, 2);
    for (let frame = 0; frame < 120; frame++) {
      stepSpring(spring, 100, 1 / 60);
      peak = Math.max(peak, spring.value);
    }
    expect(peak).toBeGreaterThan(100);
    expect(peak).toBeLessThan(108);
    expect(spring.value).toBeCloseTo(100, 4);
    expect(spring.velocity).toBeCloseTo(0, 4);
  });
  it('limits lag during fast movement and stops animating after the finger rests', () => {
    const { ghost, motion } = setup();
    motion.moveTo(600, 350);
    vi.advanceTimersByTime(16);
    const point = center(ghost);
    expect(Math.hypot(point.x - 600, point.y - 350)).toBeLessThanOrEqual(16.01);
    expect(point.x).toBeLessThan(600);
    expect(ghost.style.transform).not.toContain('rotateZ(0.000deg)');
    vi.advanceTimersByTime(1600);
    expect(center(ghost)).toEqual({ x: 600, y: 350 });
    expect(ghost.style.transform).toContain('rotateZ(0.000deg) scale(1.0600)');
    expect(vi.getTimerCount()).toBe(0);
    motion.dispose();
  });
  it('springs back to the tray size and calls completion exactly once', () => {
    const { ghost, motion } = setup();
    const done = vi.fn();
    motion.moveTo(300, 200);
    vi.advanceTimersByTime(80);
    motion.returnTo(50, 50, 0.75, done);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1600);
    expect(center(ghost)).toEqual({ x: 50, y: 50 });
    expect(ghost.style.transform).toContain('scale(0.7500)');
    expect(done).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels pending frames and return callbacks when disposed', () => {
    const { motion } = setup();
    const done = vi.fn();
    motion.moveTo(200, 300);
    vi.advanceTimersByTime(32);
    motion.returnTo(50, 50, 1, done);
    motion.dispose();
    vi.advanceTimersByTime(1600);
    expect(done).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
