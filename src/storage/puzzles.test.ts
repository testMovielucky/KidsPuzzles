import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import {
  deleteUserPuzzle,
  getUserPuzzle,
  getUserPuzzles,
  puzzleDatabase,
  saveUserPuzzle,
  storageErrorMessage,
  type UserPuzzle,
} from './puzzles';

afterEach(async () => {
  await puzzleDatabase.puzzles.clear();
});
function sample(id: string, createdAt: number): UserPuzzle {
  return {
    id,
    createdAt,
    title: 'Мой пазл',
    image: new Blob(['photo'], { type: 'image/jpeg' }),
    thumbnail: new Blob(['preview']),
    width: 1024,
    height: 1024,
  };
}
it('persists local Blobs, returns newest first and deletes only the selected puzzle', async () => {
  await saveUserPuzzle(sample('user-first', 1));
  await saveUserPuzzle(sample('user-second', 2));
  expect((await getUserPuzzles()).map((item) => item.id)).toEqual(['user-second', 'user-first']);
  expect(await (await getUserPuzzle('user-first'))!.image.text()).toBe('photo');
  await deleteUserPuzzle('user-second');
  expect(await getUserPuzzle('user-second')).toBeUndefined();
  expect(await getUserPuzzle('user-first')).toBeDefined();
});
it('does not overwrite an existing photo on an ID collision', async () => {
  await saveUserPuzzle(sample('same-id', 1));
  await expect(saveUserPuzzle(sample('same-id', 2))).rejects.toThrow();
  expect((await getUserPuzzle('same-id'))!.createdAt).toBe(1);
});
it('gives useful feedback when storage is full', () => {
  const error = new Error('QuotaExceededError');
  expect(storageErrorMessage(error)).toContain('свободного места');
});
