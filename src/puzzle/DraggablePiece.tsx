import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { canSnap, type Difficulty, type Piece } from './engine';
import { sound } from '../audio/sound';
import { PieceArtwork } from './PieceArtwork';
import { PIECE_SCALE } from './geometry';

interface Drag {
  id: number;
  ghost: HTMLDivElement;
  source: HTMLButtonElement;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  size: number;
  startX: number;
  startY: number;
  moved: boolean;
  frame: number;
}
export function DraggablePiece({
  piece,
  size,
  imageUrl,
  boardRef,
  selected,
  onSelect,
  onPlace,
  snapThreshold,
}: {
  piece: Piece;
  size: Difficulty;
  imageUrl: string;
  boardRef: RefObject<HTMLDivElement | null>;
  selected: boolean;
  onSelect: () => void;
  onPlace: (index: number) => void;
  snapThreshold: number;
}) {
  const active = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returningGhost = useRef<HTMLDivElement | null>(null);
  const returningSource = useRef<HTMLButtonElement | null>(null);

  function cleanup() {
    const drag = active.current;
    if (drag) {
      active.current = null;
      cancelAnimationFrame(drag.frame);
      drag.source.classList.remove('drag-source');
      if (drag.source.hasPointerCapture(drag.id)) drag.source.releasePointerCapture(drag.id);
      drag.ghost.remove();
    }
    if (returnTimer.current) clearTimeout(returnTimer.current);
    returningGhost.current?.remove();
    returningSource.current?.classList.remove('drag-source');
    returningGhost.current = null;
    returningSource.current = null;
  }
  useEffect(() => {
    const cancel = () => cleanup();
    window.addEventListener('resize', cancel);
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      cleanup();
      window.removeEventListener('resize', cancel);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
    };
  }, []);

  function start(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || document.querySelector('.drag-ghost')) return;
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    sound.unlock();
    cleanup();
    suppressClick.current = false;
    const source = event.currentTarget;
    const rect = source.getBoundingClientRect();
    const artwork = source.querySelector('svg')?.cloneNode(true) as SVGSVGElement | undefined;
    if (!artwork) return;
    // The drag copy must not share its SVG clip ID with the source in Safari.
    const clip = artwork.querySelector('clipPath');
    const clippedImage = artwork.querySelector('[clip-path]');
    if (clip && clippedImage) {
      clip.id += '-drag';
      clippedImage.setAttribute('clip-path', `url(#${clip.id})`);
    }
    const pieceSize = (board.width / size) * PIECE_SCALE;
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
      width: `${pieceSize}px`,
      height: `${pieceSize}px`,
    });
    ghost.appendChild(artwork);
    const drag: Drag = {
      id: event.pointerId,
      ghost,
      source,
      offsetX: (0.5 - (event.clientX - rect.left) / rect.width) * pieceSize,
      offsetY: (0.5 - (event.clientY - rect.top) / rect.height) * pieceSize,
      x: event.clientX,
      y: event.clientY,
      size: pieceSize,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      frame: 0,
    };
    active.current = drag;
    position(drag);
    document.body.appendChild(ghost);
    source.classList.add('drag-source');
    source.setPointerCapture(event.pointerId);
  }
  function position(drag: Drag) {
    drag.ghost.style.transform = `translate3d(${drag.x + drag.offsetX - drag.size / 2}px,${drag.y + drag.offsetY - drag.size / 2}px,0) scale(1.06)`;
  }
  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = active.current;
    if (!drag || drag.id !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.moved ||= Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 5;
    if (!drag.frame)
      drag.frame = requestAnimationFrame(() => {
        drag.frame = 0;
        position(drag);
      });
  }
  function end(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = active.current;
    if (!drag || drag.id !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.moved ||= Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 5;
    const board = boardRef.current?.getBoundingClientRect();
    suppressClick.current = drag.moved;
    const correct =
      drag.moved &&
      board &&
      canSnap(
        piece,
        { x: drag.x + drag.offsetX, y: drag.y + drag.offsetY },
        board,
        size,
        snapThreshold,
      );
    if (correct) {
      cleanup();
      onPlace(piece.index);
      return;
    }
    if (!drag.moved) {
      cleanup();
      return;
    }
    cancelAnimationFrame(drag.frame);
    position(drag);
    active.current = null;
    if (drag.source.hasPointerCapture(drag.id)) drag.source.releasePointerCapture(drag.id);
    const rect = drag.source.getBoundingClientRect();
    drag.ghost.style.transition = 'transform 180ms ease, opacity 180ms ease';
    drag.ghost.style.transformOrigin = 'top left';
    drag.ghost.style.transform = `translate3d(${rect.left}px,${rect.top}px,0) scale(${rect.width / drag.size})`;
    returningGhost.current = drag.ghost;
    returningSource.current = drag.source;
    returnTimer.current = setTimeout(() => {
      drag.ghost.remove();
      drag.source.classList.remove('drag-source');
      returningGhost.current = null;
      returningSource.current = null;
    }, 180);
  }
  return (
    <button
      className={`tray-piece ${selected ? 'piece-selected' : ''}`}
      aria-label={`Кусочек ${piece.index + 1}`}
      aria-pressed={selected}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={() => {
        suppressClick.current = true;
        cleanup();
      }}
      onLostPointerCapture={() => {
        if (active.current) cleanup();
      }}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (event.detail === 0 || !suppressClick.current) {
          sound.unlock();
          onSelect();
        }
        suppressClick.current = false;
      }}
    >
      <PieceArtwork piece={piece} size={size} imageUrl={imageUrl} />
    </button>
  );
}
