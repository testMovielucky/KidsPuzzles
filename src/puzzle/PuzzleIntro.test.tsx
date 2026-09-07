// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GameBoard } from './GameBoard';
import { SettingsProvider } from '../app/settings';
import { INTRO_CUT_MS, INTRO_PREVIEW_MS } from './PuzzleIntro';
import type { Difficulty } from './engine';

const nativeAnimate = Element.prototype.animate;
let reduced = false;
let portrait = false;
let layoutReady = true;
let boardTop = 80;
let notifyLayout: () => void;
let trayMedia: EventTarget;
let calls: { element: Element; frames: Keyframe[]; cancel: ReturnType<typeof vi.fn> }[];

beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  portrait = false;
  layoutReady = true;
  boardTop = 80;
  trayMedia = new EventTarget();
  calls = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        notifyLayout = () => callback([], this as unknown as ResizeObserver);
      }
      observe() {}
      disconnect() {}
    },
  );
  localStorage.clear();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion') ? reduced : portrait,
    addEventListener: query.includes('reduced-motion')
      ? vi.fn()
      : trayMedia.addEventListener.bind(trayMedia),
    removeEventListener: query.includes('reduced-motion')
      ? vi.fn()
      : trayMedia.removeEventListener.bind(trayMedia),
  }));
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      set src(_: string) {
        this.onload?.();
      }
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (!layoutReady) return new DOMRect();
    if (this.classList.contains('puzzle-board')) return new DOMRect(20, boardTop, 300, 300);
    if (this.hasAttribute('data-intro-target')) {
      const index = Array.from(this.parentElement!.children).indexOf(this);
      return portrait
        ? new DOMRect(20 + index * 160, 420, 150, 150)
        : new DOMRect(360 + (index % 3) * 110, 110 + Math.floor(index / 3) * 110, 100, 100);
    }
    return new DOMRect();
  });
  Element.prototype.animate = vi.fn(function (
    this: Element,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    let timer: ReturnType<typeof setTimeout>;
    let reject: (reason?: unknown) => void;
    const finished = new Promise<void>((resolve, fail) => {
      reject = fail;
      timer = setTimeout(resolve, Number(options.delay ?? 0) + Number(options.duration));
    });
    const cancel = vi.fn(() => {
      clearTimeout(timer);
      reject(new Error('canceled'));
    });
    calls.push({ element: this, frames, cancel });
    return { finished, cancel } as unknown as Animation;
  }) as typeof Element.prototype.animate;
});

afterEach(() => {
  cleanup();
  Element.prototype.animate = nativeAnimate;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function setup(size: Difficulty = 3) {
  const view = render(
    <MemoryRouter>
      <SettingsProvider>
        <GameBoard
          puzzle={{ id: 'intro', title: 'Машина', imageUrl: '/car.png', categoryId: 'cars' }}
          size={size}
        />
      </SettingsProvider>
    </MemoryRouter>,
  );
  await advance(144);
  return view;
}
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
const pieces = () => screen.queryAllByRole('button', { name: /^Кусочек \d+$/ });

describe('puzzle introduction', () => {
  it('does not skip the introduction for scroll or resize events with unchanged geometry', async () => {
    await setup();
    fireEvent.scroll(window);
    fireEvent(window, new Event('resize'));
    expect(document.querySelector('.puzzle-intro')).not.toBeNull();
    expect(pieces()).toHaveLength(0);
    await advance(3200);
    expect(calls.filter((call) => call.element.classList.contains('intro-piece'))).toHaveLength(9);
    expect(pieces()).toHaveLength(6);
  });

  it('waits for nonzero layout instead of skipping the introduction', async () => {
    layoutReady = false;
    await setup();
    expect(document.querySelector('.game-layout')?.getAttribute('aria-busy')).toBe('true');
    await advance(80);
    expect(pieces()).toHaveLength(0);
    layoutReady = true;
    act(() => notifyLayout());
    await advance(144);
    await advance(3200);
    expect(calls.filter((call) => call.element.classList.contains('intro-piece'))).toHaveLength(9);
    expect(pieces()).toHaveLength(6);
  });

  it('restarts after a layout shift without letting canceled flights unlock the game', async () => {
    await setup();
    await advance(1600);
    boardTop += 40;
    act(() => notifyLayout());
    await advance(160);
    expect(document.querySelector('.puzzle-intro')).not.toBeNull();
    expect(pieces()).toHaveLength(0);
    expect((document.querySelector('.intro-original') as HTMLElement).style.top).toBe('120px');
    await advance(3200);
    expect(pieces()).toHaveLength(6);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the full picture, cuts it, then flies pieces before enabling play', async () => {
    await setup();
    expect(document.querySelector('.intro-original')).not.toBeNull();
    expect(screen.getByText('Посмотри на картинку.')).toBeDefined();
    expect(pieces()).toHaveLength(0);
    expect(calls).toHaveLength(0);
    const cell = screen.getByRole('button', {
      name: 'Место: ряд 1, столбец 1',
    }) as HTMLButtonElement;
    expect(cell.disabled).toBe(true);
    const next = screen.getByRole('button', { name: 'Следующие кусочки' }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.click(cell);
    expect(screen.getByLabelText('Собрано 0 из 9')).toBeDefined();
    await advance(INTRO_PREVIEW_MS);
    expect(screen.getByText('Картинка разделяется на кусочки.')).toBeDefined();
    expect(calls.filter((call) => call.element.classList.contains('piece-outline'))).toHaveLength(
      9,
    );
    await advance(INTRO_CUT_MS);
    expect(screen.getByText('Кусочки отправляются в панель.')).toBeDefined();
    expect(pieces()).toHaveLength(0);
    await advance(1000);
    expect(document.querySelector('.puzzle-intro')).toBeNull();
    expect(pieces()).toHaveLength(6);
    expect(next.disabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    const piece = pieces()[0]!;
    const index = Number(piece.getAttribute('aria-label')!.split(' ')[1]) - 1;
    fireEvent.click(piece);
    fireEvent.click(
      screen.getByRole('button', {
        name: `Место: ряд ${Math.floor(index / 3) + 1}, столбец ${(index % 3) + 1}`,
      }),
    );
    expect(screen.getByLabelText('Собрано 1 из 9')).toBeDefined();
  });

  it.each([3, 4, 5] as const)(
    'lands the first page precisely in the tray at difficulty %s',
    async (size) => {
      portrait = size === 4;
      await setup(size);
      const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-intro-target]')).map(
        (node) => node.getBoundingClientRect(),
      );
      await advance(INTRO_PREVIEW_MS + INTRO_CUT_MS);
      const flights = calls.filter((call) => call.element.classList.contains('intro-piece'));
      expect(flights).toHaveLength(size * size);
      const landed = flights.filter((call) => call.frames.at(-1)!.opacity === 1);
      expect(landed).toHaveLength(portrait ? 2 : 6);
      landed.forEach((flight, index) => {
        const node = flight.element as HTMLElement;
        const transform = String(flight.frames.at(-1)!.transform);
        const [, dx, dy] = transform.match(/translate3d\(([-.\d]+)px,([-.\d]+)px,0\)/)!;
        const scale = Number(transform.match(/scale\(([-.\d]+)\)/)![1]);
        const extent = Number.parseFloat(node.style.width);
        const left =
          Number.parseFloat(node.style.left) + Number(dx) + (extent - extent * scale) / 2;
        const top = Number.parseFloat(node.style.top) + Number(dy) + (extent - extent * scale) / 2;
        expect(left).toBeCloseTo(targets[index]!.left);
        expect(top).toBeCloseTo(targets[index]!.top);
        expect(extent * scale).toBeCloseTo(targets[index]!.width);
      });
      await advance(1700);
      expect(document.querySelector('.puzzle-intro')).toBeNull();
      expect(pieces()).toHaveLength(targets.length);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each(['reduced motion', 'missing animation API'])(
    'shows a short still picture with %s',
    async (mode) => {
      reduced = mode === 'reduced motion';
      if (!reduced) Reflect.deleteProperty(Element.prototype, 'animate');
      await setup();
      expect(document.querySelector('.intro-original')).not.toBeNull();
      await advance(INTRO_PREVIEW_MS - 1);
      expect(pieces()).toHaveLength(0);
      await advance(1);
      expect(pieces()).toHaveLength(6);
      expect(calls).toHaveLength(0);
    },
  );

  it('replays with the new tray positions after rotating the phone', async () => {
    await setup(5);
    await advance(INTRO_PREVIEW_MS + INTRO_CUT_MS + 100);
    const previousFlights = [...calls];
    act(() => {
      portrait = true;
      trayMedia.dispatchEvent(new Event('change'));
      window.dispatchEvent(new Event('resize'));
    });
    await advance(144);
    expect(pieces()).toHaveLength(0);
    expect(previousFlights.every((call) => call.cancel.mock.calls.length > 0)).toBe(true);
    await advance(3000);
    expect(pieces()).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByLabelText('Собрано 0 из 25')).toBeDefined();
  });

  it('waits while hidden and plays the introduction when the page becomes visible', async () => {
    let hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    await setup();
    await advance(INTRO_PREVIEW_MS + INTRO_CUT_MS);
    hidden = true;
    fireEvent(document, new Event('visibilitychange'));
    await advance(5000);
    expect(pieces()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    hidden = false;
    fireEvent(document, new Event('visibilitychange'));
    await advance(144);
    expect(document.querySelector('.intro-original')).not.toBeNull();
    await advance(3000);
    expect(pieces()).toHaveLength(6);
  });

  it('waits for the image to load before showing the full picture', async () => {
    let loaded: (() => void) | null = null;
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        set src(_: string) {
          loaded = this.onload;
        }
      },
    );
    await setup();
    expect(screen.getByText('Открываем картинку…')).toBeDefined();
    expect(document.querySelector('.puzzle-intro')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    act(() => loaded?.());
    await advance(144);
    expect(document.querySelector('.intro-original')).not.toBeNull();
    expect(pieces()).toHaveLength(0);
  });

  it('cleans up animations and timers when leaving the game during flight', async () => {
    const view = await setup();
    await advance(INTRO_PREVIEW_MS + INTRO_CUT_MS);
    view.unmount();
    await advance(3000);
    expect(document.querySelector('.puzzle-intro')).toBeNull();
    expect(calls.every((call) => call.cancel.mock.calls.length > 0)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('replays the introduction when starting the same puzzle again', async () => {
    await setup();
    await advance(3000);
    for (let count = 0; count < 9; count++) {
      const piece = pieces()[0]!;
      const index = Number(piece.getAttribute('aria-label')!.split(' ')[1]) - 1;
      fireEvent.click(piece);
      fireEvent.click(
        screen.getByRole('button', {
          name: `Место: ряд ${Math.floor(index / 3) + 1}, столбец ${(index % 3) + 1}`,
        }),
      );
    }
    fireEvent.click(screen.getByRole('button', { name: 'Ещё раз' }));
    await advance(144);
    expect(document.querySelector('.intro-original')).not.toBeNull();
    expect(pieces()).toHaveLength(0);
    await advance(3000);
    expect(pieces()).toHaveLength(6);
    expect(screen.getByLabelText('Собрано 0 из 9')).toBeDefined();
  });

  it('unlocks the game if the browser fails to start an animation', async () => {
    Element.prototype.animate = vi.fn(() => {
      throw new Error('Animation unavailable');
    });
    await setup();
    await advance(INTRO_PREVIEW_MS);
    expect(document.querySelector('.puzzle-intro')).toBeNull();
    expect(pieces()).toHaveLength(6);
    expect(vi.getTimerCount()).toBe(0);
  });
});
