import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Puzzle } from '../data/puzzles';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { AudioSettings } from '../components/AudioSettings';
import { sound } from '../audio/sound';
import { useSettings } from '../app/settings';
import {
  createPieces,
  DEFAULT_SNAP_THRESHOLD,
  placePiece,
  shuffle,
  type Difficulty,
} from './engine';
import { DraggablePiece } from './DraggablePiece';
import { PieceArtwork } from './PieceArtwork';
import { useTraySize } from './useTraySize';
import { PuzzleIntro, type IntroPhase } from './PuzzleIntro';
import { CelebrationBalloons } from './CelebrationBalloons';

const introMessages = {
  preview: 'Посмотри на картинку.',
  cut: 'Картинка разделяется на кусочки.',
  scatter: 'Кусочки отправляются в панель.',
  ready: '',
};

export function GameBoard({
  puzzle,
  size,
  snapThreshold = DEFAULT_SNAP_THRESHOLD,
}: {
  puzzle: Puzzle;
  size: Difficulty;
  snapThreshold?: number;
}) {
  const { soundEnabled, toggleSound } = useSettings();
  const traySize = useTraySize();
  const pieces = useMemo(() => createPieces(size), [size]);
  const [order, setOrder] = useState(() => shuffle(pieces));
  const [placed, setPlaced] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [pageStart, setPageStart] = useState(0);
  const [original, setOriginal] = useState(false);
  const [audioSettings, setAudioSettings] = useState(false);
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [announcement, setAnnouncement] = useState('');
  const [introPhase, setIntroPhase] = useState<IntroPhase>('preview');
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const placedRef = useRef<number[]>([]);
  const isIntro = introPhase !== 'ready';
  const finishIntro = useCallback(() => {
    setIntroPhase('ready');
    setAnnouncement('Можно собирать! Переноси кусочки на картинку.');
  }, []);
  const remaining = order.filter((piece) => !placed.includes(piece.index));
  const pageCount = Math.max(1, Math.ceil(remaining.length / traySize));
  const currentPage = Math.min(Math.floor(pageStart / traySize), pageCount - 1);
  const visible = remaining.slice(currentPage * traySize, (currentPage + 1) * traySize);
  const complete = placed.length === size * size;
  const back =
    puzzle.categoryId === 'my-puzzles' ? '/my-puzzles' : `/category/${puzzle.categoryId}`;

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (alive) setImageStatus('ready');
    };
    img.onerror = () => {
      if (alive) setImageStatus('error');
    };
    img.src = puzzle.imageUrl;
    return () => {
      alive = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [puzzle.imageUrl]);

  function place(index: number) {
    if (isIntro || placedRef.current.includes(index)) return;
    const next = placePiece(placedRef.current, index, size);
    placedRef.current = next;
    setPlaced(next);
    setSelected(null);
    sound.play(next.length === size * size ? 'complete' : 'place');
    setAnnouncement(
      next.length === size * size
        ? 'Получилось! Картинка собрана.'
        : `Кусочек на месте. Собрано ${next.length} из ${size * size}.`,
    );
  }
  function tryCell(index: number) {
    if (selected === index) place(index);
    else if (selected !== null) {
      setSelected(null);
      setAnnouncement('Попробуй другое место.');
    }
  }
  function restart() {
    setPlaced([]);
    placedRef.current = [];
    setSelected(null);
    setOrder(shuffle(pieces));
    setPageStart(0);
    setIntroPhase('preview');
    setAnnouncement('Соберём ещё раз!');
  }
  if (imageStatus === 'error')
    return (
      <main className="page empty-state">
        <h1>Картинка не открылась</h1>
        <p>Вернитесь к картинкам и попробуйте снова.</p>
        <Link className="button primary" to={back}>
          К картинкам
        </Link>
      </main>
    );

  return (
    <main className="game-page">
      <div className="game-toolbar">
        <Link to={back} className="icon-button" aria-label="К выбору пазлов">
          <Icon name="back" />
        </Link>
        <div className="game-title">
          <h1 title={puzzle.title}>{puzzle.title}</h1>
          <span>
            {size} × {size}
          </span>
        </div>
        <button
          className="icon-button game-sound-button"
          aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          aria-pressed={soundEnabled}
          onClick={toggleSound}
        >
          <Icon name={soundEnabled ? 'sound' : 'muted'} />
        </button>
        <button
          className="icon-button game-sound-button"
          aria-label="Настроить музыку и звуки"
          onClick={() => setAudioSettings(true)}
        >
          <Icon name="music" />
        </button>
        <button
          className="button preview-button"
          onClick={() => setOriginal(true)}
          aria-label="Посмотреть картинку"
          disabled={isIntro}
        >
          <Icon name="eye" />
          <span>Подсказка</span>
        </button>
      </div>
      {imageStatus === 'loading' ? (
        <p className="loading-state" role="status">
          Открываем картинку…
        </p>
      ) : (
        <div className={`game-layout ${complete ? 'is-complete' : ''}`} aria-busy={isIntro}>
          <div className="board-section">
            <div className="board-space">
              <div className="board-frame">
                <div
                  className="puzzle-board"
                  ref={boardRef}
                  style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
                  aria-label="Поле пазла"
                >
                  <img
                    className="board-guide"
                    src={puzzle.imageUrl}
                    alt=""
                    style={isIntro && introPhase === 'preview' ? { opacity: 1 } : undefined}
                  />
                  {pieces.map((piece) =>
                    placed.includes(piece.index) ? (
                      <div
                        key={piece.index}
                        className="board-cell placed-piece"
                        aria-label={`Кусочек ${piece.index + 1} на месте`}
                      >
                        <PieceArtwork
                          piece={piece}
                          size={size}
                          imageUrl={puzzle.imageUrl}
                          onBoard
                        />
                      </div>
                    ) : (
                      <button
                        key={piece.index}
                        className="board-cell empty-cell"
                        disabled={isIntro}
                        onClick={() => tryCell(piece.index)}
                        aria-label={`Место: ряд ${piece.row + 1}, столбец ${piece.column + 1}`}
                      >
                        <PieceArtwork
                          piece={piece}
                          size={size}
                          imageUrl={puzzle.imageUrl}
                          slot
                          onBoard
                        />
                      </button>
                    ),
                  )}
                  {complete && (
                    <img
                      className="completed-image"
                      src={puzzle.imageUrl}
                      alt={`Собранный пазл: ${puzzle.title}`}
                    />
                  )}
                </div>
              </div>
            </div>
            <div
              className="game-progress"
              aria-label={`Собрано ${placed.length} из ${size * size}`}
            >
              <div className="progress-track">
                <span style={{ width: `${(placed.length / (size * size)) * 100}%` }} />
              </div>
              <span>
                {placed.length} / {size * size}
              </span>
            </div>
          </div>
          <section className="tray-section" aria-label="Кусочки пазла">
            {complete ? (
              <div className="complete-aside">
                <span className="success-badge">
                  <Icon name="check" size={40} />
                </span>
                <h2>Получилось!</h2>
                <button className="button primary" onClick={restart}>
                  <Icon name="replay" />
                  Ещё раз
                </button>
                <Link className="button" to={back}>
                  Другой пазл
                </Link>
              </div>
            ) : (
              <>
                <div className="tray-heading">
                  <h2>Кусочки</h2>
                  <span>{remaining.length}</span>
                </div>
                <p className="tray-hint">Перетаскивай на картинку</p>
                <div className="pieces-tray" ref={trayRef}>
                  {visible.map((piece) =>
                    isIntro ? (
                      <span
                        key={piece.index}
                        className="tray-piece intro-slot"
                        data-intro-target
                        aria-hidden="true"
                      />
                    ) : (
                      <DraggablePiece
                        key={piece.index}
                        piece={piece}
                        size={size}
                        imageUrl={puzzle.imageUrl}
                        boardRef={boardRef}
                        selected={selected === piece.index}
                        onSelect={() => setSelected(selected === piece.index ? null : piece.index)}
                        onPlace={place}
                        snapThreshold={snapThreshold}
                      />
                    ),
                  )}
                  {Array.from({ length: traySize - visible.length }, (_, index) => (
                    <span key={`space-${index}`} className="tray-space" aria-hidden="true" />
                  ))}
                </div>
                {pageCount > 1 && (
                  <div className="tray-pagination">
                    <button
                      className="icon-button"
                      aria-label="Предыдущие кусочки"
                      disabled={isIntro || currentPage === 0}
                      onClick={() => {
                        setPageStart((currentPage - 1) * traySize);
                        setSelected(null);
                      }}
                    >
                      <Icon name="back" />
                    </button>
                    <span aria-live="polite" aria-atomic="true">
                      {currentPage + 1} / {pageCount}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="Следующие кусочки"
                      disabled={isIntro || currentPage === pageCount - 1}
                      onClick={() => {
                        setPageStart((currentPage + 1) * traySize);
                        setSelected(null);
                      }}
                    >
                      <Icon name="arrow" />
                    </button>
                  </div>
                )}
                <p className="tap-hint">Можно нажать на кусочек, затем на его место</p>
              </>
            )}
          </section>
          {isIntro && (
            <PuzzleIntro
              order={order}
              size={size}
              imageUrl={puzzle.imageUrl}
              boardRef={boardRef}
              trayRef={trayRef}
              onPhase={setIntroPhase}
              onComplete={finishIntro}
            />
          )}
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {isIntro && imageStatus === 'ready' ? introMessages[introPhase] : announcement}
      </p>
      <Modal
        open={audioSettings}
        onOpenChange={setAudioSettings}
        title="Музыка и звуки"
        description="Настрой громкость для спокойной игры"
        className="settings-modal"
      >
        <AudioSettings />
      </Modal>
      <Modal
        open={original}
        onOpenChange={setOriginal}
        title={puzzle.title}
        description="Вот какую картинку мы собираем"
        className="original-modal"
      >
        <img src={puzzle.imageUrl} alt={puzzle.title} />
        <button className="button primary" onClick={() => setOriginal(false)}>
          Продолжить собирать
        </button>
      </Modal>
      {complete && <CelebrationBalloons />}
    </main>
  );
}
