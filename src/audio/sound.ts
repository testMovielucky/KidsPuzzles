const clamp = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

export class SoundService {
  private context: AudioContext | null = null;
  private enabled = true;
  private visible = true;
  private musicVolume = 0.3;
  private effectsVolume = 0.65;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private musicLoading: Promise<AudioBuffer> | null = null;
  private musicSource: AudioBufferSourceNode | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.master?.gain.setTargetAtTime(enabled ? 1 : 0, this.context!.currentTime, 0.025);
    if (!enabled) this.stopMusic();
  }
  setMusicVolume(volume: number) {
    this.musicVolume = clamp(volume);
    this.musicGain?.gain.cancelScheduledValues(this.context!.currentTime);
    this.musicGain?.gain.setTargetAtTime(this.musicVolume * 0.35, this.context!.currentTime, 0.04);
    if (this.musicVolume === 0) this.stopMusic();
    else if (this.context) void this.startMusic();
  }
  setEffectsVolume(volume: number) {
    this.effectsVolume = clamp(volume);
    this.effectsGain?.gain.cancelScheduledValues(this.context!.currentTime);
    this.effectsGain?.gain.setTargetAtTime(this.effectsVolume, this.context!.currentTime, 0.025);
  }
  setPageVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) void this.context?.suspend().catch(() => {});
    else if (this.context) this.unlock();
  }
  unlock() {
    if (!this.enabled || !this.visible) return;
    try {
      if (!this.context) {
        const context = new AudioContext();
        this.context = context;
        this.master = context.createGain();
        this.musicGain = context.createGain();
        this.effectsGain = context.createGain();
        this.musicGain.gain.value = this.musicVolume * 0.35;
        this.effectsGain.gain.value = this.effectsVolume;
        this.musicGain.connect(this.master);
        this.effectsGain.connect(this.master);
        this.master.connect(context.destination);
      }
      if (this.context.state !== 'running') {
        void this.context
          .resume()
          .then(() => this.startMusic())
          .catch(() => {});
      } else void this.startMusic();
    } catch {
      /* Audio is optional, including in browsers that restrict it. */
    }
  }
  private stopMusic() {
    const source = this.musicSource;
    if (source) {
      source.onended = () => source.disconnect();
      source.stop(this.context!.currentTime + 0.16);
    }
    this.musicSource = null;
  }
  private async startMusic() {
    const context = this.context;
    if (!context || !this.enabled || !this.visible || !this.musicVolume || this.musicSource) return;
    try {
      if (!this.musicBuffer) {
        this.musicLoading ??= fetch(`${import.meta.env.BASE_URL}audio/little-discoveries.wav`)
          .then((response) => {
            if (!response.ok) throw new Error('Music unavailable');
            return response.arrayBuffer();
          })
          .then((data) => context.decodeAudioData(data));
        this.musicBuffer = await this.musicLoading;
      }
      if (
        !this.enabled ||
        !this.visible ||
        !this.musicVolume ||
        this.musicSource ||
        context.state !== 'running'
      )
        return;
      const source = context.createBufferSource();
      source.buffer = this.musicBuffer;
      source.loop = true;
      source.connect(this.musicGain!);
      this.musicGain!.gain.cancelScheduledValues(context.currentTime);
      this.musicGain!.gain.setValueAtTime(0, context.currentTime);
      this.musicGain!.gain.linearRampToValueAtTime(
        this.musicVolume * 0.35,
        context.currentTime + 0.4,
      );
      source.start();
      this.musicSource = source;
    } catch {
      // A later gesture can retry; piece sounds remain available if music fails to load.
      this.musicLoading = null;
    }
  }
  play(kind: 'place' | 'complete') {
    if (!this.enabled || !this.visible || !this.effectsVolume) return;
    this.unlock();
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const notes = kind === 'place' ? [523.25, 659.25] : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.11;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.065, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      oscillator.connect(gain).connect(this.effectsGain!);
      oscillator.start(start);
      oscillator.stop(start + 0.32);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }
}
export const sound = new SoundService();
