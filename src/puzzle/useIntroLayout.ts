import { useLayoutEffect, useState, type RefObject } from 'react';

export interface IntroLayout {
  board: DOMRect;
  targets: DOMRect[];
}
const SETTLE_MS = 120;
const sameRect = (a: DOMRect, b: DOMRect) =>
  (['left', 'top', 'width', 'height'] as const).every((key) => Math.abs(a[key] - b[key]) <= 1);
function sameLayout(a: IntroLayout | null, b: IntroLayout | null) {
  if (!a || !b) return a === b;
  return (
    sameRect(a.board, b.board) &&
    a.targets.length === b.targets.length &&
    a.targets.every((rect, i) => sameRect(rect, b.targets[i]!))
  );
}

// Browser chrome, restored scroll and fonts can move the board after image.onload.
// Only start/restart once its actual coordinates have settled, never on an event alone.
export function useIntroLayout(
  boardRef: RefObject<HTMLDivElement | null>,
  trayRef: RefObject<HTMLDivElement | null>,
  onWaiting: () => void,
  onUnavailable: () => void,
) {
  const [layout, setLayout] = useState<IntroLayout | null>(null);
  useLayoutEffect(() => {
    let disposed = false;
    let frame = 0;
    let measured: IntroLayout | null = null;
    let stableSince: number | null = null;
    let missingSince: number | null = null;
    let settled = false;

    function read(): IntroLayout | null {
      const board = boardRef.current?.getBoundingClientRect();
      const targets = Array.from(
        trayRef.current?.querySelectorAll<HTMLElement>('[data-intro-target]') ?? [],
      ).map((slot) => slot.getBoundingClientRect());
      if (
        !board ||
        board.width <= 0 ||
        board.height <= 0 ||
        !targets.length ||
        targets.some((rect) => rect.width <= 0 || rect.height <= 0)
      )
        return null;
      return { board, targets };
    }
    function schedule() {
      if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(check);
    }
    function check(time: number) {
      frame = 0;
      if (disposed || document.hidden) return;
      const next = read();
      if (!sameLayout(measured, next)) {
        measured = next;
        stableSince = time;
        settled = false;
        setLayout(null);
        onWaiting();
      }
      if (!next) {
        missingSince ??= time;
        if (time - missingSince >= 3000) {
          onUnavailable();
          return;
        }
      } else {
        missingSince = null;
        stableSince ??= time;
        if (!settled && time - stableSince >= SETTLE_MS) {
          settled = true;
          setLayout(next);
        }
      }
      if (!settled) schedule();
    }
    function visibilityChanged() {
      cancelAnimationFrame(frame);
      frame = 0;
      measured = null;
      stableSince = null;
      missingSince = null;
      settled = false;
      setLayout(null);
      onWaiting();
      schedule();
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    if (boardRef.current) observer?.observe(boardRef.current);
    if (trayRef.current) observer?.observe(trayRef.current);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('visibilitychange', visibilityChanged);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [boardRef, trayRef, onWaiting, onUnavailable]);
  return layout;
}
