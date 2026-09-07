// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createPieces } from './engine';
import { PieceArtwork } from './PieceArtwork';

afterEach(cleanup);
it('uses the original image coordinates in every piece, including protruding tabs', () => {
  const pieces = createPieces(3);
  const { container } = render(
    <>
      {pieces.map((piece) => (
        <PieceArtwork key={piece.index} piece={piece} size={3} imageUrl="blob:local-photo" />
      ))}
    </>,
  );
  const clips = [...container.querySelectorAll('clipPath')].map((clip) => clip.id);
  expect(new Set(clips).size).toBe(9);
  [...container.querySelectorAll('image')].forEach((image, index) => {
    expect(image.getAttribute('href')).toBe('blob:local-photo');
    expect(Number(image.getAttribute('x'))).toBe(-pieces[index]!.column * 100 || 0);
    expect(Number(image.getAttribute('y'))).toBe(-pieces[index]!.row * 100 || 0);
    expect(image.getAttribute('width')).toBe('300');
    expect(image.getAttribute('height')).toBe('300');
  });
});
it('shows an empty slot with exactly the same outline as the matching piece', () => {
  const piece = createPieces(4)[5]!;
  const { container } = render(
    <>
      <PieceArtwork piece={piece} size={4} imageUrl="/test.svg" />
      <PieceArtwork piece={piece} size={4} imageUrl="/test.svg" slot onBoard />
    </>,
  );
  const paths = container.querySelectorAll('.piece-outline');
  expect(paths[0]!.getAttribute('d')).toBe(paths[1]!.getAttribute('d'));
  expect(container.querySelectorAll('image')).toHaveLength(1);
});
