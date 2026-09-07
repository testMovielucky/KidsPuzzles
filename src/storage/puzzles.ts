import Dexie, { type Table } from 'dexie';

export interface UserPuzzle {
  id: string;
  title: string;
  image: Blob;
  thumbnail: Blob;
  createdAt: number;
  width: number;
  height: number;
}
class PuzzleDatabase extends Dexie {
  puzzles!: Table<UserPuzzle, string>;
  constructor() {
    super('kids-puzzles');
    this.version(1).stores({ puzzles: 'id, createdAt' });
  }
}
export const puzzleDatabase = new PuzzleDatabase();
export const getUserPuzzles = () => puzzleDatabase.puzzles.orderBy('createdAt').reverse().toArray();
export const getUserPuzzle = (id: string) => puzzleDatabase.puzzles.get(id);
export async function saveUserPuzzle(puzzle: UserPuzzle): Promise<void> {
  await puzzleDatabase.puzzles.add(puzzle);
}
export async function deleteUserPuzzle(id: string): Promise<void> {
  await puzzleDatabase.puzzles.delete(id);
}

export function storageErrorMessage(error: unknown): string {
  if (error instanceof Error && /quota/i.test(error.name + error.message)) {
    return 'На устройстве мало свободного места. Удалите ненужный пазл и попробуйте ещё раз.';
  }
  return 'Не получилось открыть хранилище. Проверьте, что Safari разрешает сохранять данные сайта, и попробуйте ещё раз.';
}
