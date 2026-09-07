import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { Difficulty, Piece } from './engine';
import { PIECE_PADDING, PIECE_SCALE, PIECE_UNIT } from './geometry';
import { PieceArtwork } from './PieceArtwork';
import { useIntroLayout, type IntroLayout } from './useIntroLayout';

export const INTRO_PREVIEW_MS = 650;
export const INTRO_CUT_MS = 650;
const FLIGHT_MS = 650;
const STAGGER_MS = 28;
export type IntroPhase = 'preview' | 'cut' | 'scatter' | 'ready';

export function PuzzleIntro({
  order,
  size,
  imageUrl,
  boardRef,
  trayRef,
  onPhase,
  onComplete,
}: {
  order: Piece[];
  size: Difficulty;
  imageUrl: string;
  boardRef: RefObject<HTMLDivElement | null>;
  trayRef: RefObject<HTMLDivElement | null>;
  onPhase: (phase: IntroPhase) => void;
  onComplete: () => void;
}) {
  const waitForLayout = useCallback(() => onPhase('preview'), [onPhase]);
  const layout = useIntroLayout(boardRef, trayRef, waitForLayout, onComplete);
  return layout ? (
    <IntroAnimation
      order={order}
      size={size}
      imageUrl={imageUrl}
      layout={layout}
      onPhase={onPhase}
      onComplete={onComplete}
    />
  ) : null;
}

function IntroAnimation({
  order,
  size,
  imageUrl,
  layout,
  onPhase,
  onComplete,
}: {
  order: Piece[];
  size: Difficulty;
  imageUrl: string;
  layout: IntroLayout;
  onPhase: (phase: IntroPhase) => void;
  onComplete: () => void;
}) {
  const layerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const { board: boardRect, targets } = layout;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const animations: Animation[] = [];
    let disposed = false;
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const original = layer.querySelector<HTMLImageElement>('.intro-original')!;
    const nodes = Array.from(layer.querySelectorAll<HTMLDivElement>('.intro-piece'));
    const cell = boardRect.width / size;
    const extent = cell * PIECE_SCALE;
    Object.assign(original.style, {
      left: `${boardRect.left}px`,
      top: `${boardRect.top}px`,
      width: `${boardRect.width}px`,
      height: `${boardRect.height}px`,
    });
    nodes.forEach((node, index) => {
      const piece = order[index]!;
      Object.assign(node.style, {
        left: `${boardRect.left + (piece.column - PIECE_PADDING / PIECE_UNIT) * cell}px`,
        top: `${boardRect.top + (piece.row - PIECE_PADDING / PIECE_UNIT) * cell}px`,
        width: `${extent}px`,
        height: `${extent}px`,
        opacity: '0',
      });
      const outline = node.querySelector<SVGPathElement>('.piece-outline')!;
      outline.setAttribute('pathLength', '1');
      outline.style.strokeDasharray = '1';
      outline.style.strokeDashoffset = '1';
    });
    layer.style.visibility = 'visible';

    function later(callback: () => void, delay: number) {
      timers.push(setTimeout(() => !disposed && callback(), delay));
    }
    function animate(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
      const animation = element.animate(frames, { fill: 'forwards', ...options });
      animations.push(animation);
      // Cancellation on navigation/rotation must not leave rejected promises behind.
      void animation.finished.catch(() => {});
      return animation;
    }
    function dispose() {
      disposed = true;
      layer!.style.visibility = 'hidden';
      timers.forEach(clearTimeout);
      animations.forEach((animation) => animation.cancel());
      motion?.removeEventListener('change', finish);
    }
    function finish() {
      if (disposed) return;
      dispose();
      onComplete();
    }
    motion?.addEventListener('change', finish);
    if (motion?.matches || typeof layer.animate !== 'function') {
      // Keep the initial picture, but skip cutting and travel with reduced motion.
      later(finish, INTRO_PREVIEW_MS);
    } else {
      later(() => {
        onPhase('cut');
        try {
          nodes.forEach((node, index) => {
            node.style.opacity = '1';
            const piece = order[index]!;
            animate(
              node.querySelector('.piece-outline')!,
              [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }],
              { duration: 500, delay: (piece.row + piece.column) * 18, easing: 'ease-in-out' },
            );
          });
          animate(original, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 });
          later(scatter, INTRO_CUT_MS);
        } catch {
          finish();
        }
      }, INTRO_PREVIEW_MS);
      function scatter() {
        onPhase('scatter');
        layer!.dataset.phase = 'scatter';
        // Other pages go into the tray first; the first page lands last and stays visible.
        const indices = order.map((_, index) => index);
        const flightOrder = [...indices.slice(targets.length), ...indices.slice(0, targets.length)];
        try {
          const flights = flightOrder.map((index, flightIndex) => {
            const piece = order[index]!;
            const node = nodes[index]!;
            const target = targets[index % targets.length]!;
            const dx =
              target.left + target.width / 2 - (boardRect.left + (piece.column + 0.5) * cell);
            const dy = target.top + target.height / 2 - (boardRect.top + (piece.row + 0.5) * cell);
            const scale = target.width / extent;
            const spreadX = (piece.column - (size - 1) / 2) * 5;
            const spreadY = (piece.row - (size - 1) / 2) * 5;
            const tilt = piece.index % 2 ? 4 : -4;
            node.style.zIndex = String(flightIndex);
            return animate(
              node,
              [
                { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)', opacity: 1 },
                {
                  transform: `translate3d(${spreadX}px,${spreadY}px,0) rotate(${tilt}deg) scale(0.97)`,
                  opacity: 1,
                  offset: 0.18,
                },
                {
                  transform: `translate3d(${dx * 0.55}px,${dy * 0.55 - 20}px,0) rotate(${-tilt}deg) scale(${(1 + scale) / 2})`,
                  opacity: 1,
                  offset: 0.62,
                },
                {
                  transform: `translate3d(${dx}px,${dy}px,0) rotate(0deg) scale(${scale})`,
                  opacity: index < targets.length ? 1 : 0,
                },
              ],
              {
                duration: FLIGHT_MS,
                delay: flightIndex * STAGGER_MS,
                easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
              },
            );
          });
          void Promise.all(flights.map((animation) => animation.finished)).then(finish, finish);
          // Count from the actual flight start, even after a delayed browser frame.
          later(finish, FLIGHT_MS + (order.length - 1) * STAGGER_MS + 250);
        } catch {
          finish();
        }
      }
    }
    return dispose;
  }, [order, size, imageUrl, layout, onPhase, onComplete]);

  return createPortal(
    <div ref={layerRef} className="puzzle-intro" aria-hidden="true">
      <img className="intro-original" src={imageUrl} alt="" />
      {order.map((piece) => (
        <div className="intro-piece" key={piece.index}>
          <PieceArtwork piece={piece} size={size} imageUrl={imageUrl} />
        </div>
      ))}
    </div>,
    document.body,
  );
}
