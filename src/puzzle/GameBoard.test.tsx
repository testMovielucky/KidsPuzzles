// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GameBoard } from './GameBoard';
import { SettingsProvider } from '../app/settings';
import type { Difficulty } from './engine';

let compact = true;
let media: EventTarget;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 16),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 300, 300),
  );
  compact = true;
  media = new EventTarget();
  vi.stubGlobal('matchMedia', () => ({
    matches: compact,
    addEventListener: media.addEventListener.bind(media),
    removeEventListener: media.removeEventListener.bind(media),
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
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function setup(size: Difficulty = 3) {
  const view = render(
    <MemoryRouter>
      <SettingsProvider>
        <GameBoard
          size={size}
          puzzle={{
            id: 'test',
            categoryId: 'animals',
            title: 'Пазл',
            imageUrl: '/test.svg',
          }}
        />
      </SettingsProvider>
    </MemoryRouter>,
  );
  act(() => vi.advanceTimersByTime(160));
  act(() => vi.advanceTimersByTime(650));
  return view;
}

function visiblePieces() {
  return screen.getAllByRole('button', { name: /^Кусочек \d+$/ });
}

function place(button: HTMLElement, size: number) {
  const index = Number(button.getAttribute('aria-label')!.split(' ')[1]) - 1;
  fireEvent.click(button);
  fireEvent.click(
    screen.getByRole('button', {
      name: `Место: ряд ${Math.floor(index / size) + 1}, столбец ${(index % size) + 1}`,
    }),
  );
  return index;
}

describe('responsive puzzle tray', () => {
  it.each([3, 4, 5] as const)(
    'makes every piece reachable with two pieces per page at difficulty %s',
    (size) => {
      setup(size);
      const seen = new Set<string>();
      while (true) {
        const pieces = visiblePieces();
        expect(pieces.length).toBeLessThanOrEqual(2);
        pieces.forEach((piece) => seen.add(piece.getAttribute('aria-label')!));
        const next = screen.getByRole('button', { name: 'Следующие кусочки' });
        if ((next as HTMLButtonElement).disabled) break;
        fireEvent.click(next);
      }
      expect(seen.size).toBe(size * size);
    },
  );

  it('keeps placed pieces and the visible group when switching to a wider screen and back', () => {
    setup(5);
    const index = place(visiblePieces()[0]!, 5);
    fireEvent.click(screen.getByRole('button', { name: 'Следующие кусочки' }));
    const group = visiblePieces().map((piece) => piece.getAttribute('aria-label'));
    act(() => {
      compact = false;
      media.dispatchEvent(new Event('change'));
    });
    expect(visiblePieces()).toHaveLength(6);
    expect(visiblePieces().map((piece) => piece.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining(group),
    );
    expect(screen.getByLabelText(`Кусочек ${index + 1} на месте`)).toBeDefined();
    act(() => {
      compact = true;
      media.dispatchEvent(new Event('change'));
    });
    expect(visiblePieces().map((piece) => piece.getAttribute('aria-label'))).toEqual(group);
    expect(screen.getByLabelText('Собрано 1 из 25')).toBeDefined();
  });

  it('returns to an existing page after placing the final piece on the last page', () => {
    setup(5);
    for (let page = 0; page < 12; page++) {
      fireEvent.click(screen.getByRole('button', { name: 'Следующие кусочки' }));
    }
    expect(visiblePieces()).toHaveLength(1);
    place(visiblePieces()[0]!, 5);
    expect(visiblePieces()).toHaveLength(2);
    expect(screen.getByLabelText('Собрано 1 из 25')).toBeDefined();
    expect(
      (screen.getByRole('button', { name: 'Следующие кусочки' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('can finish and restart using the compact tray', () => {
    setup();
    for (let piece = 0; piece < 9; piece++) place(visiblePieces()[0]!, 3);
    expect(screen.getByAltText('Собранный пазл: Пазл')).toBeDefined();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('group', { name: 'Праздничные шарики' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Другой пазл' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ещё раз' }));
    expect(screen.queryByRole('group', { name: 'Праздничные шарики' })).toBeNull();
    act(() => vi.advanceTimersByTime(160));
    act(() => vi.advanceTimersByTime(650));
    expect(visiblePieces()).toHaveLength(2);
    expect(screen.getByLabelText('Собрано 0 из 9')).toBeDefined();
  });

  it('keeps sound available from the game toolbar', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Выключить звук' }));
    expect(screen.getByRole('button', { name: 'Включить звук' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(localStorage.getItem('kids-puzzles:sound')).toBe('off');
  });
  it('adjusts music during play without resetting the puzzle', () => {
    setup();
    place(visiblePieces()[0]!, 3);
    fireEvent.click(screen.getByRole('button', { name: 'Настроить музыку и звуки' }));
    fireEvent.change(screen.getByRole('slider', { name: 'Громкость музыки' }), {
      target: { value: '22' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.getByLabelText('Собрано 1 из 9')).toBeDefined();
    expect(visiblePieces()).toHaveLength(2);
    expect(localStorage.getItem('kids-puzzles:music-volume')).toBe('0.22');
  });
});
