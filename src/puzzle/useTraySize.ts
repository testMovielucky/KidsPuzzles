import { useSyncExternalStore } from 'react';

const compactTray = '(max-width: 700px) and (orientation: portrait)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(compactTray);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function useTraySize() {
  const compact = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(compactTray).matches,
    () => false,
  );
  return compact ? 2 : 6;
}
