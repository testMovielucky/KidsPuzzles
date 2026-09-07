import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { categories, type Puzzle } from '../data/puzzles';
import { DifficultyModal } from '../components/DifficultyModal';
import { Icon } from '../components/Icon';

export function Category() {
  const { categoryId } = useParams();
  const category = categories.find((item) => item.id === categoryId);
  const [selected, setSelected] = useState<Puzzle | null>(null);
  if (!category)
    return (
      <main className="page empty-state">
        <h1>Пойдём за пазлами?</h1>
        <Link className="button primary" to="/">
          На главную
        </Link>
      </main>
    );
  return (
    <main className="page">
      <div className="page-heading">
        <Link className="icon-button" to="/" aria-label="На главную">
          <Icon name="back" />
        </Link>
        <div>
          <h1>{category.title}</h1>
          <p>Выбирай, кого соберём</p>
        </div>
      </div>
      <div className="puzzle-grid">
        {category.puzzles.map((puzzle) => (
          <button
            key={puzzle.id}
            className={`puzzle-card ${category.color}`}
            onClick={() => setSelected(puzzle)}
            aria-label={`Собрать: ${puzzle.title}`}
          >
            <img src={puzzle.imageUrl} alt={puzzle.title} />
            <span>
              <strong>{puzzle.title}</strong>
              <Icon name="arrow" />
            </span>
          </button>
        ))}
      </div>
      <DifficultyModal puzzle={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
