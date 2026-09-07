import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

export const CELEBRATION_MS = 10_000;
const CONFETTI_MS = 1200;
const colors = ['#ec8dab', '#87bbde', '#edc36d', '#94c9a3', '#b6a0df', '#eea17f'];
type Balloon = { id: number; duration: number; lane: number };
type Burst = { id: number; x: number; y: number };

export function CelebrationBalloons() {
  const gradientId = useId();
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [ended, setEnded] = useState(false);
  const [reduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const popped = useRef(new Set<number>());

  function later(callback: () => void, delay: number) {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
  }

  useEffect(() => {
    const pending = timers.current;
    // Flights finish within ten seconds; a final burst may finish falling afterwards.
    for (let id = 0; id < (reduced ? 6 : 20); id++) {
      const delay = 180 + id * (reduced ? 120 : 260);
      const duration = reduced ? CELEBRATION_MS - delay : 4200 + (id % 3) * 240;
      const lane = reduced ? (id + 0.5) / 6 : ((id * 37 + 11) % 97) / 96;
      later(() => setBalloons((current) => [...current, { id, duration, lane }]), delay);
      later(
        () => setBalloons((current) => current.filter((balloon) => balloon.id !== id)),
        delay + duration,
      );
    }
    later(() => {
      setBalloons([]);
      setEnded(true);
    }, CELEBRATION_MS);
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, [reduced]);

  function pop(id: number, button: HTMLButtonElement) {
    // Pointer down reacts immediately to touch; the following click must not pop twice.
    if (popped.current.has(id)) return;
    popped.current.add(id);
    const rect = button.getBoundingClientRect();
    setBalloons((current) => current.filter((balloon) => balloon.id !== id));
    setBursts((current) => [
      ...current,
      { id, x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.32 },
    ]);
    later(() => setBursts((current) => current.filter((burst) => burst.id !== id)), CONFETTI_MS);
  }

  if (ended && bursts.length === 0) return null;
  return createPortal(
    <div
      className="balloon-celebration"
      role="group"
      aria-label="Праздничные шарики"
      data-still={reduced || undefined}
    >
      {balloons.map(({ id, duration, lane }) => (
        <button
          key={id}
          type="button"
          className="celebration-balloon"
          aria-label={`Лопнуть шарик ${id + 1}`}
          style={
            {
              '--lane': lane,
              '--flight-time': `${duration}ms`,
              '--drift': `${id % 2 ? 18 : -18}px`,
              '--size': `${(id % 3) * 6}px`,
              '--rest-height': `${16 + (id % 3) * 18}%`,
            } as CSSProperties
          }
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            pop(id, event.currentTarget);
          }}
          onClick={(event) => pop(id, event.currentTarget)}
        >
          <svg viewBox="0 0 100 140" aria-hidden="true">
            <defs>
              <radialGradient id={`${gradientId}-${id}`} cx="30%" cy="24%" r="80%">
                <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
                <stop offset="0.36" stopColor={colors[id % colors.length]} />
                <stop offset="1" stopColor={colors[id % colors.length]} />
              </radialGradient>
            </defs>
            <path
              d="M50 92 C34 108 66 117 48 137"
              fill="none"
              stroke="#797188"
              strokeOpacity="0.5"
              strokeWidth="1.5"
            />
            <path d="M50 84 L44 94 Q50 97 56 94 Z" fill={colors[id % colors.length]} />
            <ellipse
              cx="50"
              cy="45"
              rx="37"
              ry="42"
              fill={`url(#${gradientId}-${id})`}
              stroke={colors[id % colors.length]}
              strokeWidth="1.5"
            />
            <path
              d="M28 32 Q29 21 39 17"
              fill="none"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.65"
            />
          </svg>
        </button>
      ))}
      {bursts.map(({ id, x, y }) => (
        <div className="balloon-burst" key={id} aria-hidden="true" style={{ left: x, top: y }}>
          <span className="balloon-pop-ring" />
          {Array.from({ length: 18 }, (_, index) => (
            <i
              key={index}
              style={
                {
                  '--dx': `${Math.cos(index * 2.4) * (45 + (index % 4) * 22)}px`,
                  '--lift': `${-25 - (index % 5) * 12}px`,
                  '--fall': `${140 + (index % 4) * 30}px`,
                  '--turn': `${(index % 2 ? 1 : -1) * (220 + index * 31)}deg`,
                  background: colors[(id + index) % colors.length],
                  borderRadius: index % 3 === 0 ? '50%' : '2px',
                  width: index % 3 === 0 ? 9 : 7,
                  height: index % 3 === 0 ? 9 : 13,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>,
    document.body,
  );
}
