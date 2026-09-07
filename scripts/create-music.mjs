import { mkdir, writeFile } from 'node:fs/promises';

// Original 16-bar miniature, "Little discoveries": C major, 3/4, 90 BPM.
const sampleRate = 22050;
const beat = 60 / 90;
const duration = 16 * 3 * beat;
const frames = Math.round(duration * sampleRate);
const channels = [new Float64Array(frames), new Float64Array(frames)];
const events = [];
const chords = [
  [48, 55, 64],
  [47, 55, 62],
  [45, 52, 60],
  [41, 53, 60],
  [40, 55, 60],
  [43, 53, 62],
  [43, 55, 59],
  [48, 55, 64],
  [45, 52, 60],
  [40, 55, 62],
  [41, 53, 60],
  [40, 55, 60],
  [38, 53, 60],
  [43, 53, 60],
  [43, 55, 59],
  [48, 55, 64],
];
// [MIDI pitch, beat in the bar, length in beats]. Rests leave room for the game.
const melody = [
  [
    [76, 0, 0.9],
    [79, 1, 0.7],
    [76, 2, 0.8],
  ],
  [
    [74, 0, 1.7],
    [71, 2, 0.8],
  ],
  [
    [72, 0, 0.8],
    [76, 1, 0.9],
    [74, 2, 0.8],
  ],
  [[72, 0, 2.3]],
  [
    [71, 0, 0.8],
    [72, 1, 0.8],
    [76, 2, 0.8],
  ],
  [
    [74, 0, 1.3],
    [69, 1.5, 0.8],
  ],
  [
    [71, 0, 0.8],
    [74, 1, 1.2],
  ],
  [[72, 0, 2.2]],
  [
    [76, 0, 1.3],
    [72, 1.5, 0.8],
  ],
  [
    [74, 0, 0.8],
    [71, 1, 1.4],
  ],
  [
    [69, 0, 0.8],
    [72, 1, 0.8],
    [76, 2, 0.8],
  ],
  [
    [79, 0, 1.1],
    [76, 1.5, 1.0],
  ],
  [
    [77, 0, 1.3],
    [74, 1.5, 1.0],
  ],
  [
    [72, 0, 1.0],
    [69, 1.5, 0.8],
  ],
  [
    [71, 0, 0.8],
    [74, 1, 1.2],
  ],
  [[72, 0, 2.2]],
];

function note(pitch, start, length, level, voice, pan = 0) {
  events.push({ pitch, start, length, level, voice });
  const frequency = 440 * 2 ** ((pitch - 69) / 12);
  const release = voice === 'bell' ? 1.6 : 0.65;
  const count = Math.ceil((length + release) * sampleRate);
  const offset = Math.round(start * sampleRate);
  const stereo = [Math.sqrt((1 - pan) / 2), Math.sqrt((1 + pan) / 2)];
  for (let frame = 0; frame < count; frame++) {
    const t = frame / sampleRate;
    const phase = 2 * Math.PI * frequency * t;
    const attack = 1 - Math.exp(-t / (voice === 'bass' ? 0.035 : 0.012));
    const fade =
      t <= length ? 1 : Math.cos((Math.min(1, (t - length) / release) * Math.PI) / 2) ** 2;
    const decay = Math.exp(-t / (voice === 'bass' ? 2.2 : voice === 'bell' ? 1.1 : 1.0));
    const tone =
      voice === 'bell'
        ? Math.sin(phase) + 0.16 * Math.sin(phase * 2.01) * Math.exp(-t * 3)
        : Math.sin(phase) +
          0.2 * Math.sin(phase * 2) * Math.exp(-t * 2) +
          0.055 * Math.sin(phase * 3) * Math.exp(-t * 4);
    const sample = tone * attack * fade * decay * level;
    for (let side = 0; side < 2; side++) {
      // Wrap note releases and room reflections into the beginning for a seamless loop.
      channels[side][(offset + frame) % frames] += sample * stereo[side];
      channels[side][(offset + frame + Math.round(sampleRate * (side ? 0.211 : 0.137))) % frames] +=
        sample * 0.12;
      channels[side][(offset + frame + Math.round(sampleRate * (side ? 0.401 : 0.359))) % frames] +=
        sample * 0.055;
    }
  }
}

chords.forEach(([bass, third, fifth], bar) => {
  const start = bar * 3 * beat;
  note(bass, start, 2.5 * beat, 0.095, 'bass', -0.08);
  note(third, start + beat * 0.95, 1.1 * beat, 0.055, 'keys', -0.3);
  note(fifth, start + beat * 1.95, 0.9 * beat, 0.047, 'keys', 0.25);
  for (const [pitch, offset, length] of melody[bar]) {
    note(pitch, start + offset * beat, length * beat, 0.105, 'keys', 0.07);
  }
  if (bar % 4 === 3) note(bar === 11 ? 79 : 76, start + 2 * beat, 0.6, 0.028, 'bell', 0.42);
});

let peak = 0;
let squareSum = 0;
for (const channel of channels) {
  for (const sample of channel) {
    peak = Math.max(peak, Math.abs(sample));
    squareSum += sample * sample;
  }
}
const scale = 0.72 / peak;
const wav = Buffer.alloc(44 + frames * 4);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(frames * 4, 40);
for (let frame = 0; frame < frames; frame++) {
  for (let side = 0; side < 2; side++) {
    wav.writeInt16LE(Math.round(channels[side][frame] * scale * 32767), 44 + frame * 4 + side * 2);
  }
}
await mkdir('public/audio', { recursive: true });
await writeFile('public/audio/little-discoveries.wav', wav);
await writeFile(
  'public/audio/README.md',
  '# Маленькие открытия\n\nОригинальная инструментальная миниатюра для этой игры: до мажор, 3/4, 90 BPM, 32 секунды. Мягкие синтезированные клавиши, бас и редкие колокольчики. Композиция и синтез находятся в `scripts/create-music.mjs`; сторонние записи и сэмплы не использованы.\n\nWAV: stereo PCM, 22 050 Hz, 16 bit. Хвосты нот и отражения перенесены через границу цикла для непрерывного повторения.\n',
);
const seam = Math.max(...channels.map((channel) => Math.abs(channel[0] - channel.at(-1)) * scale));
console.log(
  JSON.stringify(
    {
      duration,
      notes: events.length,
      bytes: wav.length,
      peak: 0.72,
      rms: Math.sqrt(squareSum / (frames * 2)) * scale,
      seamStep: seam,
    },
    null,
    2,
  ),
);
