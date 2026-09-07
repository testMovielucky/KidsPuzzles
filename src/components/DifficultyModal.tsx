import { useNavigate } from 'react-router-dom';
import type { Puzzle } from '../data/puzzles';
import { Modal } from './Modal';

export function DifficultyModal({
  puzzle,
  onClose,
}: {
  puzzle: Puzzle | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <Modal
      open={!!puzzle}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Сколько кусочков?"
      description="Выбирай, как будем собирать"
    >
      {puzzle && (
        <>
          <img className="difficulty-preview" src={puzzle.imageUrl} alt={puzzle.title} />
          <div className="difficulty-options">
            {([3, 4, 5] as const).map((size) => (
              <button
                key={size}
                className={`difficulty-option size-${size}`}
                onClick={() => navigate(`/play/${puzzle.id}?size=${size}`)}
                aria-label={`${size} на ${size}, ${size * size} кусочков`}
              >
                <span
                  className="mini-grid"
                  style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
                  aria-hidden="true"
                >
                  {Array.from({ length: size * size }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
                <strong>
                  {size} × {size}
                </strong>
                <span>{size * size} кусочков</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
