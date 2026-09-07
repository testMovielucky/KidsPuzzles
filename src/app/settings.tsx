import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { sound } from '../audio/sound';

const key = 'kids-puzzles:sound';
function loadSound(): boolean {
  try {
    return localStorage.getItem(key) !== 'off';
  } catch {
    return true;
  }
}
function loadVolume(key: string, fallback: number) {
  try {
    const stored = localStorage.getItem(key);
    const volume = stored === null ? fallback : Number(stored);
    return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Session settings still work. */
  }
}
const musicKey = 'kids-puzzles:music-volume';
const effectsKey = 'kids-puzzles:effects-volume';
const SettingsContext = createContext({
  soundEnabled: true,
  toggleSound: () => {},
  musicVolume: 0.3,
  effectsVolume: 0.65,
  setMusicVolume: (_volume: number) => {},
  setEffectsVolume: (_volume: number) => {},
});
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(loadSound);
  const [musicVolume, setMusic] = useState(() => loadVolume(musicKey, 0.3));
  const [effectsVolume, setEffects] = useState(() => loadVolume(effectsKey, 0.65));
  useEffect(() => {
    sound.setEnabled(soundEnabled);
    sound.setMusicVolume(musicVolume);
    sound.setEffectsVolume(effectsVolume);
  }, [soundEnabled, musicVolume, effectsVolume]);
  useEffect(() => {
    const unlock = () => sound.unlock();
    const visibility = () => sound.setPageVisible(!document.hidden);
    const hide = () => sound.setPageVisible(false);
    visibility();
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', visibility);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', visibility);
      hide();
    };
  }, []);
  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setEnabled(next);
    if (next) sound.unlock();
    save(key, next ? 'on' : 'off');
  }
  function setMusicVolume(volume: number) {
    setMusic(volume);
    sound.setMusicVolume(volume);
    sound.unlock();
    save(musicKey, String(volume));
  }
  function setEffectsVolume(volume: number) {
    setEffects(volume);
    sound.setEffectsVolume(volume);
    sound.unlock();
    save(effectsKey, String(volume));
  }
  return (
    <SettingsContext.Provider
      value={{
        soundEnabled,
        toggleSound,
        musicVolume,
        effectsVolume,
        setMusicVolume,
        setEffectsVolume,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
export const useSettings = () => useContext(SettingsContext);
