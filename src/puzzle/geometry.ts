export type Edge = -1 | 0 | 1;
export type Side = 'top' | 'right' | 'bottom' | 'left';
export type PieceEdges = Record<Side, Edge>;
export interface Coordinate {
  x: number;
  y: number;
}
export interface EdgeSegment {
  from: Coordinate;
  to: Coordinate;
  controls?: [Coordinate, Coordinate];
}

export const PIECE_UNIT = 100;
export const PIECE_PADDING = 28;
export const PIECE_EXTENT = PIECE_UNIT + PIECE_PADDING * 2;
export const PIECE_SCALE = PIECE_EXTENT / PIECE_UNIT;

function seam(boundary: number, position: number, direction: number): Edge {
  return (boundary * 7 + position * 11 + direction) % 3 === 0 ? -1 : 1;
}
export function createEdges(row: number, column: number, size: number): PieceEdges {
  return {
    top: row === 0 ? 0 : (-seam(row, column, 0) as Edge),
    right: column === size - 1 ? 0 : seam(column + 1, row, 1),
    bottom: row === size - 1 ? 0 : seam(row + 1, column, 0),
    left: column === 0 ? 0 : (-seam(column, row, 1) as Edge),
  };
}

// The symmetric neck and round head use the same curves on both sides of every seam.
// A clockwise traversal keeps positive edges outward on all four sides.
export function edgeSegments(side: Side, edge: Edge): EdgeSegment[] {
  function map(x: number, y: number): Coordinate {
    y *= edge;
    switch (side) {
      case 'top':
        return { x, y };
      case 'right':
        return { x: PIECE_UNIT - y, y: x };
      case 'bottom':
        return { x: PIECE_UNIT - x, y: PIECE_UNIT - y };
      case 'left':
        return { x: y, y: PIECE_UNIT - x };
    }
  }
  if (edge === 0) return [{ from: map(0, 0), to: map(100, 0) }];
  return [
    { from: map(0, 0), to: map(35, 0) },
    { from: map(35, 0), controls: [map(42, 0), map(44, 0)], to: map(42, -6) },
    { from: map(42, -6), controls: [map(36, -16), map(37, -24)], to: map(50, -24) },
    { from: map(50, -24), controls: [map(63, -24), map(64, -16)], to: map(58, -6) },
    { from: map(58, -6), controls: [map(56, 0), map(58, 0)], to: map(65, 0) },
    { from: map(65, 0), to: map(100, 0) },
  ];
}
export function piecePath(edges: PieceEdges): string {
  const point = ({ x, y }: Coordinate) => `${x} ${y}`;
  const segments = (['top', 'right', 'bottom', 'left'] as const)
    .flatMap((side) => edgeSegments(side, edges[side]))
    .map((segment) =>
      segment.controls
        ? `C ${point(segment.controls[0])} ${point(segment.controls[1])} ${point(segment.to)}`
        : `L ${point(segment.to)}`,
    );
  return `M 0 0 ${segments.join(' ')} Z`;
}
