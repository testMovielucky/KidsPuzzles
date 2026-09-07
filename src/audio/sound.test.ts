import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundService } from './sound';

function gain() {
  return {
    gain: {
      value: 1,
      setTargetAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
  };
}
function source() {
  return {
    buffer: null,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  };
}
let contexts: FakeContext[];
class FakeContext {
  state = 'running';
  currentTime = 10;
  destination = {};
  gains: ReturnType<typeof gain>[] = [];
  sources: ReturnType<typeof source>[] = [];
  oscillators: unknown[] = [];
  constructor() {
    contexts.push(this);
  }
  createGain() {
    const node = gain();
    this.gains.push(node);
    return node;
  }
  createBufferSource() {
    const node = source();
    this.sources.push(node);
    return node;
  }
  createOscillator() {
    const node = {
      ...source(),
      connect: vi.fn().mockReturnValue({ connect: vi.fn() }),
      frequency: { value: 0 },
      type: '',
    };
    this.oscillators.push(node);
    return node;
  }
  decodeAudioData = vi.fn(async () => ({ duration: 32 }));
  suspend = vi.fn(async () => {
    this.state = 'suspended';
  });
  resume = vi.fn(async () => {
    this.state = 'running';
  });
}
const response = () => new Response(new ArrayBuffer(4), { status: 200 });
const settle = () => vi.waitFor(() => expect(contexts[0]?.sources.length).toBe(1));

beforeEach(() => {
  contexts = [];
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response()),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('background music', () => {
  it('waits for a gesture and starts one loop even after repeated gestures during loading', async () => {
    const audio = new SoundService();
    audio.setMusicVolume(0.3);
    expect(contexts).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
    audio.unlock();
    audio.unlock();
    audio.unlock();
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(contexts[0]!.sources[0]!.loop).toBe(true);
    expect(contexts[0]!.sources[0]!.start).toHaveBeenCalledTimes(1);
  });
  it('does not start a pending download after the sound has been muted', async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }) as Promise<Response>,
    );
    const audio = new SoundService();
    audio.unlock();
    audio.setEnabled(false);
    resolve(response());
    await vi.waitFor(() => expect(contexts[0]!.decodeAudioData).toHaveBeenCalledTimes(1));
    expect(contexts[0]!.sources).toHaveLength(0);
    audio.setEnabled(true);
    audio.unlock();
    await settle();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('suspends in the background and resumes the existing loop on return', async () => {
    const audio = new SoundService();
    audio.unlock();
    await settle();
    audio.setPageVisible(false);
    expect(contexts[0]!.state).toBe('suspended');
    audio.play('place');
    expect(contexts[0]!.oscillators).toHaveLength(0);
    audio.setPageVisible(true);
    await vi.waitFor(() => expect(contexts[0]!.state).toBe('running'));
    expect(contexts[0]!.sources).toHaveLength(1);
  });
  it('keeps effects available when music is zero and music available when effects are zero', async () => {
    const audio = new SoundService();
    audio.setMusicVolume(0);
    audio.unlock();
    audio.play('place');
    expect(fetch).not.toHaveBeenCalled();
    expect(contexts[0]!.oscillators).toHaveLength(2);
    audio.setEffectsVolume(0);
    audio.setMusicVolume(0.5);
    await settle();
    audio.play('complete');
    expect(contexts[0]!.oscillators).toHaveLength(2);
    expect(contexts[0]!.gains[1]!.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
      0.175,
      10.4,
    );
  });
  it('can retry a failed music download without losing piece sounds', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
    const audio = new SoundService();
    audio.unlock();
    await new Promise((resolve) => setTimeout(resolve, 0));
    audio.play('place');
    await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(contexts[0]!.oscillators).toHaveLength(2);
  });
  it('mutes both channels and releases the music source', async () => {
    const audio = new SoundService();
    audio.unlock();
    await settle();
    audio.setEnabled(false);
    audio.play('complete');
    expect(contexts[0]!.gains[0]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 10, 0.025);
    expect(contexts[0]!.sources[0]!.stop).toHaveBeenCalledTimes(1);
    expect(contexts[0]!.oscillators).toHaveLength(0);
  });
  it('does not crash if Web Audio is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    const audio = new SoundService();
    expect(() => {
      audio.unlock();
      audio.play('place');
      audio.setEnabled(false);
    }).not.toThrow();
  });
});
