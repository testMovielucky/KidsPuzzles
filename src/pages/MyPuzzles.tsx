import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { DifficultyModal } from '../components/DifficultyModal';
import type { Puzzle } from '../data/puzzles';
import { prepareImage, type PreparedImage } from '../images/prepareImage';
import {
  deleteUserPuzzle,
  getUserPuzzles,
  saveUserPuzzle,
  storageErrorMessage,
} from '../storage/puzzles';

interface Draft extends PreparedImage {
  url: string;
}
export function MyPuzzles() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<Puzzle | null>(null);
  const [toDelete, setToDelete] = useState<Puzzle | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const operation = useRef(false);
  const draftUrl = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (draftUrl.current) URL.revokeObjectURL(draftUrl.current);
    };
  }, []);
  useEffect(() => {
    let canceled = false;
    const urls: string[] = [];
    setLoading(true);
    getUserPuzzles()
      .then((records) => {
        if (canceled) return;
        setPuzzles(
          records.map((record) => {
            const url = URL.createObjectURL(record.thumbnail);
            urls.push(url);
            return { id: record.id, title: record.title, imageUrl: url, categoryId: 'my-puzzles' };
          }),
        );
      })
      .catch((reason: unknown) => {
        if (!canceled) setError(storageErrorMessage(reason));
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [revision]);

  function discardDraft() {
    if (draftUrl.current) URL.revokeObjectURL(draftUrl.current);
    draftUrl.current = null;
    setDraft(null);
  }
  async function importFile(file: File | undefined) {
    if (!file || operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      const prepared = await prepareImage(file);
      if (!mounted.current) return;
      discardDraft();
      const url = URL.createObjectURL(prepared.image);
      draftUrl.current = url;
      setDraft({ ...prepared, url });
    } catch (reason) {
      if (mounted.current)
        setError(
          reason instanceof Error
            ? reason.message
            : 'Не удалось открыть картинку. Попробуйте другую.',
        );
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function save() {
    if (!draft || operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      await saveUserPuzzle({
        id: `user-${crypto.randomUUID()}`,
        title: `Мой пазл ${new Date().toLocaleDateString('ru-RU')}`,
        image: draft.image,
        thumbnail: draft.thumbnail,
        width: draft.width,
        height: draft.height,
        createdAt: Date.now(),
      });
      if (mounted.current) {
        discardDraft();
        setRevision((value) => value + 1);
      }
    } catch (reason) {
      if (mounted.current) setError(storageErrorMessage(reason));
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function remove() {
    if (!toDelete || operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      await deleteUserPuzzle(toDelete.id);
      if (mounted.current) {
        setToDelete(null);
        setRevision((value) => value + 1);
      }
    } catch (reason) {
      if (mounted.current) setError(storageErrorMessage(reason));
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <main className="page">
      <div className="page-heading my-heading">
        <Link className="icon-button" to="/" aria-label="На главную">
          <Icon name="back" />
        </Link>
        <div>
          <h1>Мои пазлы</h1>
          <p>Любимые фотографии становятся игрой</p>
        </div>
        <button
          className="button primary add-photo"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Icon name="plus" />
          <span>{busy ? 'Готовим…' : 'Добавить картинку'}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/*"
        aria-label="Выбрать фотографию"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          void importFile(file);
        }}
      />
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <p className="loading-state" role="status">
          Открываем ваши картинки…
        </p>
      ) : puzzles.length ? (
        <div className="puzzle-grid">
          {puzzles.map((puzzle) => (
            <div className="user-puzzle" key={puzzle.id}>
              <button
                className="puzzle-card sky"
                onClick={() => setSelected(puzzle)}
                aria-label={`Собрать: ${puzzle.title}`}
              >
                <img src={puzzle.imageUrl} alt={puzzle.title} />
                <span>
                  <strong>{puzzle.title}</strong>
                  <Icon name="arrow" />
                </span>
              </button>
              <button
                className="icon-button delete-photo"
                aria-label={`Удалить: ${puzzle.title}`}
                onClick={() => setToDelete(puzzle)}
              >
                <Icon name="trash" size={20} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state personal-empty">
          <span className="empty-photo-icon">
            <Icon name="image" size={64} />
          </span>
          <h2>Здесь будут ваши картинки</h2>
          <p>Фото любимой игрушки, питомца или всей семьи — выбирайте вместе.</p>
          <button className="button" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Icon name="plus" />
            Выбрать фотографию
          </button>
        </div>
      )}
      <p className="privacy-note">
        <Icon name="heart" size={17} />
        Фотографии хранятся только на этом устройстве
      </p>
      <DifficultyModal puzzle={selected} onClose={() => setSelected(null)} />
      <Modal
        open={!!draft}
        onOpenChange={(open) => {
          if (!open && !busy) discardDraft();
        }}
        title="Вот такой будет пазл"
        description="Мы оставили квадратную часть в центре фотографии"
        className="import-modal"
      >
        {draft && (
          <>
            <img src={draft.url} alt="Предпросмотр обрезанной фотографии" />
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button className="button primary" disabled={busy} onClick={() => void save()}>
                <Icon name="check" />
                {busy ? 'Сохраняем…' : 'Сохранить'}
              </button>
              <button className="button" disabled={busy} onClick={discardDraft}>
                Отмена
              </button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open && !busy) setToDelete(null);
        }}
        title="Удалить этот пазл?"
        description="Фотография в медиатеке останется. Удалится только копия в игре."
      >
        {toDelete && (
          <>
            <img className="difficulty-preview" src={toDelete.imageUrl} alt={toDelete.title} />
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button className="button primary" onClick={() => setToDelete(null)} disabled={busy}>
                Оставить
              </button>
              <button className="button" onClick={() => void remove()} disabled={busy}>
                Удалить
              </button>
            </div>
          </>
        )}
      </Modal>
    </main>
  );
}
