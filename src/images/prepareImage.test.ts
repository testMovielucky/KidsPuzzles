import { expect, it } from 'vitest';
import { centerCrop } from './prepareImage';

it('center crops portrait and landscape photos without stretching', () => {
  expect(centerCrop(3000, 4000)).toEqual({ x: 0, y: 500, side: 3000, outputSize: 1024 });
  expect(centerCrop(4000, 3000)).toEqual({ x: 500, y: 0, side: 3000, outputSize: 1024 });
});
it('does not upscale a small image and rejects invalid dimensions', () => {
  expect(centerCrop(400, 400).outputSize).toBe(400);
  expect(() => centerCrop(0, 200)).toThrow();
  expect(() => centerCrop(Number.NaN, 200)).toThrow();
});
