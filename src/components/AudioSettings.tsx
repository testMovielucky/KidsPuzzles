import { useSettings } from '../app/settings';
import { Icon } from './Icon';

export function AudioSettings() {
  const {
    soundEnabled,
    toggleSound,
    musicVolume,
    effectsVolume,
    setMusicVolume,
    setEffectsVolume,
  } = useSettings();
  return (
    <div className="audio-settings">
      <button
        className="setting-row"
        role="switch"
        aria-checked={soundEnabled}
        onClick={toggleSound}
      >
        <span>
          <Icon name={soundEnabled ? 'sound' : 'muted'} />
          Все звуки
        </span>
        <span className={`switch-track ${soundEnabled ? 'is-on' : ''}`}>
          <i />
        </span>
      </button>
      <label className="volume-setting">
        <span>
          <span>Музыка</span>
          <output>{Math.round(musicVolume * 100)}%</output>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(musicVolume * 100)}
          aria-label="Громкость музыки"
          disabled={!soundEnabled}
          onChange={(event) => setMusicVolume(Number(event.target.value) / 100)}
        />
      </label>
      <label className="volume-setting">
        <span>
          <span>Звуки кусочков</span>
          <output>{Math.round(effectsVolume * 100)}%</output>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(effectsVolume * 100)}
          aria-label="Громкость звуков кусочков"
          disabled={!soundEnabled}
          onChange={(event) => setEffectsVolume(Number(event.target.value) / 100)}
        />
      </label>
    </div>
  );
}
