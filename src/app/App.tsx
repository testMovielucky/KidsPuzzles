import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Home } from '../pages/Home';
import { Category } from '../pages/Category';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { AudioSettings } from '../components/AudioSettings';
import { PuzzleGame } from '../pages/PuzzleGame';
import { MyPuzzles } from '../pages/MyPuzzles';
import { SettingsProvider, useSettings } from './settings';
import { UpdateNotice, usePwaStatus } from './PwaStatus';

export function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
function AppContent() {
  const [settings, setSettings] = useState(false);
  const location = useLocation();
  const { soundEnabled, toggleSound } = useSettings();
  const pwa = usePwaStatus();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className={`app-shell ${location.pathname.startsWith('/play/') ? 'game-active' : ''}`}>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Пазлы — на главную">
          <span className="brand-mark">
            <Icon name="puzzle" size={27} />
          </span>
          <span>
            пазлы<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="header-actions">
          <span className="age-label">для маленьких открытий</span>
          <button
            className="icon-button"
            aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            aria-pressed={soundEnabled}
            onClick={toggleSound}
          >
            <Icon name={soundEnabled ? 'sound' : 'muted'} />
          </button>
          <button className="icon-button" aria-label="Настройки" onClick={() => setSettings(true)}>
            <Icon name="settings" />
          </button>
        </div>
      </header>
      <div className="landscape-controls">
        <button
          className="icon-button"
          aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          aria-pressed={soundEnabled}
          onClick={toggleSound}
        >
          <Icon name={soundEnabled ? 'sound' : 'muted'} />
        </button>
        <button className="icon-button" aria-label="Настройки" onClick={() => setSettings(true)}>
          <Icon name="settings" />
        </button>
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/category/:categoryId" element={<Category />} />
        <Route path="/play/:puzzleId" element={<PuzzleGame />} />
        <Route path="/my-puzzles" element={<MyPuzzles />} />
        <Route
          path="*"
          element={
            <main className="page empty-state">
              <h1>Пойдём за пазлами?</h1>
              <Link className="button primary" to="/">
                К картинкам
              </Link>
            </main>
          }
        />
      </Routes>
      <UpdateNotice needRefresh={pwa.needRefresh} update={() => pwa.updateServiceWorker(true)} />
      <Modal
        open={settings}
        onOpenChange={setSettings}
        title="Для родителей"
        description="Всё для спокойной игры"
        className="settings-modal"
      >
        <AudioSettings />
        <div className="settings-copy">
          <h3>Как играть</h3>
          <p>
            Выберите картинку и количество кусочков. Перетащите кусочек на его место. Можно нажать
            на кусочек, а затем на нужное место.
          </p>
          <h3>Установить на iPhone или iPad</h3>
          <p>Откройте игру в Safari. Нажмите «Поделиться», затем «На экран Домой» и «Добавить».</p>
          <h3>Играть без интернета</h3>
          <p>
            {pwa.registrationError
              ? 'Не удалось подготовить офлайн-режим. Откройте игру с интернетом ещё раз.'
              : pwa.offlineReady
                ? 'Игра готова к работе без интернета.'
                : 'При первом открытии дождитесь полной загрузки игры с интернетом. Встроенные картинки сохранятся на устройстве.'}
          </p>
          <h3>Ваши фотографии</h3>
          <p>
            Они хранятся только на этом устройстве. При удалении данных сайта или приложения
            сохранённые пазлы могут исчезнуть. Исходные фотографии в медиатеке останутся.
          </p>
        </div>
      </Modal>
    </div>
  );
}
