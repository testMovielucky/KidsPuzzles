import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLocation } from 'react-router-dom';

export function usePwaStatus() {
  const [registrationError, setRegistrationError] = useState(false);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError() {
      setRegistrationError(true);
    },
  });
  return { offlineReady, needRefresh, updateServiceWorker, registrationError };
}
export function UpdateNotice({
  needRefresh,
  update,
}: {
  needRefresh: boolean;
  update: () => Promise<void>;
}) {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  if (!needRefresh || dismissed || location.pathname.startsWith('/play/')) return null;
  return (
    <aside className="update-notice" aria-label="Обновление игры">
      <p>Готова новая версия пазлов</p>
      <button className="button primary" onClick={() => void update()}>
        Обновить
      </button>
      <button className="button" onClick={() => setDismissed(true)}>
        Позже
      </button>
    </aside>
  );
}
