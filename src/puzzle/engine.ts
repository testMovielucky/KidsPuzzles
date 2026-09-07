export type Difficulty = 3 | 4 | 5;
export interface Point {
  x: number;
  y: number;
}
export interface Piece {
  index: number;
  row: number;
  column: number;
  target: Point;
  edges: PieceEdges;
}
export const DEFAULT_SNAP_THRESHOLD = 0.65;

export function parseDifficulty(value: string | null): Difficulty {
  return value === '4' ? 4 : value === '5' ? 5 : 3;
}
export function createPieces(size: Difficulty): Piece[] {
  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const column = index % size;
    return {
      index,
      row,
      column,
      target: { x: (column + 0.5) / size, y: (row + 0.5) / size },
      edges: createEdges(row, column, size),
    };
  });
}
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
export function canSnap(
  piece: Piece,
  center: Point,
  board: { left: number; top: number; width: number },
  size: Difficulty,
  threshold = DEFAULT_SNAP_THRESHOLD,
): boolean {
  if (board.width <= 0 || threshold < 0) return false;
  const targetX = board.left + piece.target.x * board.width;
  const targetY = board.top + piece.target.y * board.width;
  return Math.hypot(center.x - targetX, center.y - targetY) <= (board.width / size) * threshold;
}
export function placePiece(placed: readonly number[], index: number, size: Difficulty): number[] {
  if (index < 0 || index >= size * size || !Number.isInteger(index) || placed.includes(index))
    return [...placed];
  return [...placed, index];
}
import { createEdges, type PieceEdges } from './geometry';
