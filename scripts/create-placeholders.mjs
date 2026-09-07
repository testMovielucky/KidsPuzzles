import { mkdir, writeFile } from 'node:fs/promises';

// Deliberately simple geometry for testing; replace these files with artwork later.
const groups = [
  { background: '#eeeafa', accent: '#a4a0d5', ids: ['castle', 'dragon', 'fox'] },
  {
    background: '#fff0dc',
    accent: '#dfb575',
    ids: ['lion', 'elephant', 'giraffe', 'cat', 'dog', 'panda'],
  },
  {
    background: '#e7f0e7',
    accent: '#8bb7ad',
    ids: ['car', 'truck', 'tractor', 'firetruck', 'bus'],
  },
];
await mkdir('public/assets/puzzles', { recursive: true });
for (const group of groups) {
  for (const [index, id] of group.ids.entries()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><rect width="900" height="900" fill="${group.background}"/><circle cx="${170 + index * 55}" cy="170" r="100" fill="#ffda96"/><path d="M0 640Q250 270 510 560T900 420V900H0Z" fill="${group.accent}" opacity=".5"/><path d="M0 810 900 590V900H0Z" fill="${group.accent}" opacity=".7"/><rect x="240" y="270" width="420" height="390" rx="55" fill="#fffaf0" transform="rotate(${index * 4 - 6} 450 450)"/><path d="M330 330h100c-25-62 65-62 45 0h95v100c62-25 62 65 0 45v105H465c25-62-65-62-45 0h-90V475c62 25 62-65 0-45Z" fill="${group.accent}"/><circle cx="750" cy="300" r="45" fill="#fffaf0"/><circle cx="160" cy="740" r="32" fill="#ffda96"/><path d="m725 705 24 51 56 8-40 40 9 57-49-27-50 27 10-57-41-40 56-8Z" fill="#fffaf0"/></svg>`;
    await writeFile(`public/assets/puzzles/${id}.svg`, svg);
  }
}
