import { describe, expect, it } from 'vitest';
import { canSnap, createPieces, parseDifficulty, placePiece, shuffle } from './engine';

describe('puzzle engine', () => {
  it.each([3, 4, 5] as const)('covers the full %s × %s board exactly once', (size) => {
    const pieces = createPieces(size);
    expect(pieces).toHaveLength(size * size);
    expect(new Set(pieces.map((piece) => `${piece.row}:${piece.column}`)).size).toBe(size * size);
    expect(pieces[0]!.target).toEqual({ x: 0.5 / size, y: 0.5 / size });
    expect(pieces.at(-1)!.target).toEqual({ x: (size - 0.5) / size, y: (size - 0.5) / size });
  });
  it('accepts near misses but rejects a wrong neighboring cell', () => {
    const piece = createPieces(3)[0]!;
    const board = { left: 20, top: 100, width: 300 };
    expect(canSnap(piece, { x: 125, y: 150 }, board, 3)).toBe(true);
    expect(canSnap(piece, { x: 170, y: 150 }, board, 3)).toBe(false);
    expect(canSnap(piece, { x: 125, y: 150 }, board, 3, 0.2)).toBe(false);
    expect(canSnap(piece, { x: 70, y: 150 }, { ...board, width: 0 }, 3)).toBe(false);
  });
  it('keeps correct placement across a changed viewport', () => {
    const piece = createPieces(5)[13]!;
    const board = { left: 87, top: 62, width: 450 };
    expect(
      canSnap(
        piece,
        {
          x: board.left + piece.target.x * board.width,
          y: board.top + piece.target.y * board.width,
        },
        board,
        5,
      ),
    ).toBe(true);
  });
  it('does not allow duplicates or invalid pieces to cause early completion', () => {
    const placed = [0, 1, 2];
    expect(placePiece(placed, 2, 3)).toEqual(placed);
    expect(placePiece(placed, 9, 3)).toEqual(placed);
    expect(placePiece(placed, -1, 3)).toEqual(placed);
    expect(placePiece(placed, 3, 3)).toEqual([0, 1, 2, 3]);
    expect(placed).toEqual([0, 1, 2]);
  });
  it('shuffles without losing pieces or mutating input', () => {
    const original = [0, 1, 2, 3, 4];
    const result = shuffle(original, () => 0);
    expect(result).not.toEqual(original);
    expect([...result].sort()).toEqual(original);
    expect(original).toEqual([0, 1, 2, 3, 4]);
  });
  it('falls back safely for tampered difficulty URLs', () => {
    expect(parseDifficulty(null)).toBe(3);
    expect(parseDifficulty('1000')).toBe(3);
    expect(parseDifficulty('4')).toBe(4);
    expect(parseDifficulty('5')).toBe(5);
  });
});
