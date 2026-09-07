import { createContext, useContext, useState, type ReactNode } from 'react';
import { sound } from '../audio/sound';

const key = 'kids-puzzles:sound';
function loadSound(): boolean {
  try {
    return localStorage.getItem(key) !== 'off';
  } catch {
    return true;
  }
}
const SettingsContext = createContext({ soundEnabled: true, toggleSound: () => {} });
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const enabled = loadSound();
    sound.setEnabled(enabled);
    return enabled;
  });
  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setEnabled(next);
    if (next) sound.unlock();
    try {
      localStorage.setItem(key, next ? 'on' : 'off');
    } catch {
      /* Session preference still works. */
    }
  }
  return (
    <SettingsContext.Provider value={{ soundEnabled, toggleSound }}>
      {children}
    </SettingsContext.Provider>
  );
}
export const useSettings = () => useContext(SettingsContext);
