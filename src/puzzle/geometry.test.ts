import { describe, expect, it } from 'vitest';
import { createPieces, type Piece } from './engine';
import {
  edgeSegments,
  piecePath,
  PIECE_PADDING,
  PIECE_UNIT,
  type Coordinate,
  type EdgeSegment,
  type Side,
} from './geometry';

function globalEdge(piece: Piece, side: Side): EdgeSegment[] {
  const point = (value: Coordinate) => ({
    x: value.x + piece.column * PIECE_UNIT,
    y: value.y + piece.row * PIECE_UNIT,
  });
  return edgeSegments(side, piece.edges[side]).map((segment) => ({
    from: point(segment.from),
    to: point(segment.to),
    ...(segment.controls
      ? { controls: segment.controls.map(point) as [Coordinate, Coordinate] }
      : {}),
  }));
}
function reversed(segments: EdgeSegment[]): EdgeSegment[] {
  return [...segments].reverse().map((segment) => ({
    from: segment.to,
    to: segment.from,
    ...(segment.controls
      ? { controls: [segment.controls[1], segment.controls[0]] as [Coordinate, Coordinate] }
      : {}),
  }));
}

describe('interlocking geometry', () => {
  it.each([3, 4, 5] as const)(
    'matches every shared Bézier seam exactly for a %s × %s puzzle',
    (size) => {
      const pieces = createPieces(size);
      for (const piece of pieces) {
        if (piece.column < size - 1) {
          const right = pieces[piece.index + 1]!;
          expect(piece.edges.right).toBe(-right.edges.left);
          expect(globalEdge(piece, 'right')).toEqual(reversed(globalEdge(right, 'left')));
        }
        if (piece.row < size - 1) {
          const below = pieces[piece.index + size]!;
          expect(piece.edges.bottom).toBe(-below.edges.top);
          expect(globalEdge(piece, 'bottom')).toEqual(reversed(globalEdge(below, 'top')));
        }
      }
    },
  );
  it.each([3, 4, 5] as const)('leaves only the outer frame flat at size %s', (size) => {
    for (const piece of createPieces(size)) {
      expect(piece.edges.top === 0).toBe(piece.row === 0);
      expect(piece.edges.bottom === 0).toBe(piece.row === size - 1);
      expect(piece.edges.left === 0).toBe(piece.column === 0);
      expect(piece.edges.right === 0).toBe(piece.column === size - 1);
    }
  });
  it('keeps all curves inside the padded artwork so tabs are never clipped', () => {
    for (const piece of createPieces(5)) {
      for (const side of ['top', 'right', 'bottom', 'left'] as const) {
        for (const segment of edgeSegments(side, piece.edges[side])) {
          for (const point of [segment.from, segment.to, ...(segment.controls ?? [])]) {
            expect(Math.min(point.x, point.y)).toBeGreaterThanOrEqual(-PIECE_PADDING);
            expect(Math.max(point.x, point.y)).toBeLessThanOrEqual(PIECE_UNIT + PIECE_PADDING);
          }
        }
      }
      expect(piecePath(piece.edges)).toMatch(/^M 0 0 .* Z$/);
    }
  });
});
