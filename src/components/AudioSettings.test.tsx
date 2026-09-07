// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { SettingsProvider } from '../app/settings';
import { AudioSettings } from './AudioSettings';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const setup = () =>
  render(
    <SettingsProvider>
      <AudioSettings />
    </SettingsProvider>,
  );
it('remembers independent music and effects volume after reopening', () => {
  const view = setup();
  fireEvent.change(screen.getByLabelText('Громкость музыки'), { target: { value: '18' } });
  fireEvent.change(screen.getByLabelText('Громкость звуков кусочков'), { target: { value: '72' } });
  view.unmount();
  setup();
  expect((screen.getByLabelText('Громкость музыки') as HTMLInputElement).value).toBe('18');
  expect((screen.getByLabelText('Громкость звуков кусочков') as HTMLInputElement).value).toBe('72');
});
it('preserves the existing mute preference without resetting channel volumes', () => {
  localStorage.setItem('kids-puzzles:sound', 'off');
  localStorage.setItem('kids-puzzles:music-volume', '0.2');
  setup();
  const music = screen.getByLabelText('Громкость музыки') as HTMLInputElement;
  expect(music.disabled).toBe(true);
  expect(music.value).toBe('20');
  fireEvent.click(screen.getByRole('switch', { name: 'Все звуки' }));
  expect(music.disabled).toBe(false);
  expect(music.value).toBe('20');
});
it('uses safe defaults for corrupted saved volume values', () => {
  localStorage.setItem('kids-puzzles:music-volume', 'broken');
  localStorage.setItem('kids-puzzles:effects-volume', 'Infinity');
  setup();
  expect((screen.getByLabelText('Громкость музыки') as HTMLInputElement).value).toBe('30');
  expect((screen.getByLabelText('Громкость звуков кусочков') as HTMLInputElement).value).toBe('65');
});
