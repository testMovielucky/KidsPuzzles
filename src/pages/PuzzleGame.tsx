import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { builtInPuzzles, type Puzzle } from '../data/puzzles';
import { parseDifficulty } from '../puzzle/engine';
import { GameBoard } from '../puzzle/GameBoard';
import { getUserPuzzle, storageErrorMessage } from '../storage/puzzles';

export function PuzzleGame() {
  const { puzzleId } = useParams();
  const [search] = useSearchParams();
  const builtIn = builtInPuzzles.find((item) => item.id === puzzleId);
  const [local, setLocal] = useState<{ id: string; puzzle?: Puzzle; error?: string } | null>(null);
  useEffect(() => {
    if (builtIn || !puzzleId) return;
    let canceled = false;
    let url: string | undefined;
    getUserPuzzle(puzzleId)
      .then((record) => {
        if (canceled) return;
        if (!record) {
          setLocal({
            id: puzzleId,
            error: 'Эта картинка уже удалена или сохранена на другом устройстве.',
          });
          return;
        }
        url = URL.createObjectURL(record.image);
        setLocal({
          id: puzzleId,
          puzzle: { id: record.id, title: record.title, imageUrl: url, categoryId: 'my-puzzles' },
        });
      })
      .catch((error: unknown) => {
        if (!canceled) setLocal({ id: puzzleId, error: storageErrorMessage(error) });
      });
    return () => {
      canceled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [puzzleId, builtIn]);
  const current = local?.id === puzzleId ? local : null;
  const puzzle = builtIn || current?.puzzle;
  const size = parseDifficulty(search.get('size'));
  if (!puzzle && !current)
    return (
      <main className="page empty-state">
        <p role="status">Открываем картинку…</p>
      </main>
    );
  if (!puzzle)
    return (
      <main className="page empty-state">
        <h1>Пойдём за другой картинкой?</h1>
        <p>{current?.error}</p>
        <Link className="button primary" to="/my-puzzles">
          Мои пазлы
        </Link>
      </main>
    );
  return <GameBoard key={`${puzzle.id}:${size}`} puzzle={puzzle} size={size} />;
}
