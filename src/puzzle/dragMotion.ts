interface Spring {
  value: number;
  velocity: number;
}

// Exact damped-spring step: stable across refresh rates and delayed frames.
export function stepSpring(
  spring: Spring,
  target: number,
  seconds: number,
  stiffness = 650,
  damping = 38,
) {
  const time = Math.min(0.05, Math.max(0, seconds));
  const decayRate = damping / 2;
  const frequency = Math.sqrt(stiffness - decayRate * decayRate);
  const displacement = spring.value - target;
  const decay = Math.exp(-decayRate * time);
  const sine = Math.sin(frequency * time);
  const cosine = Math.cos(frequency * time);
  spring.value =
    target +
    decay *
      (displacement * cosine + ((spring.velocity + decayRate * displacement) / frequency) * sine);
  spring.velocity =
    decay *
    (spring.velocity * cosine -
      ((decayRate * spring.velocity + stiffness * displacement) / frequency) * sine);
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
const resting = (spring: Spring, target: number, precision: number) =>
  Math.abs(spring.value - target) < precision && Math.abs(spring.velocity) < precision * 10;

export function createDragMotion(
  ghost: HTMLElement,
  initial: { x: number; y: number; scale: number; size: number; reducedMotion: boolean },
) {
  const spring = (value: number): Spring => ({ value, velocity: 0 });
  const x = spring(initial.x);
  const y = spring(initial.y);
  const scale = spring(initial.scale);
  const tiltX = spring(0);
  const tiltY = spring(0);
  const rotation = spring(0);
  let targetX = initial.x;
  let targetY = initial.y;
  let targetScale = 1.06;
  let frame = 0;
  let previousTime: number | null = null;
  let returning = false;
  let disposed = false;
  let finish: (() => void) | undefined;

  function render() {
    ghost.style.transform = `translate3d(${(x.value - initial.size / 2).toFixed(3)}px,${(y.value - initial.size / 2).toFixed(3)}px,0) perspective(600px) rotateX(${tiltX.value.toFixed(3)}deg) rotateY(${tiltY.value.toFixed(3)}deg) rotateZ(${rotation.value.toFixed(3)}deg) scale(${scale.value.toFixed(4)})`;
  }
  function limitLag() {
    const distance = Math.hypot(x.value - targetX, y.value - targetY);
    const limit = Math.min(24, initial.size * 0.16);
    if (distance > limit) {
      x.value = targetX + ((x.value - targetX) * limit) / distance;
      y.value = targetY + ((y.value - targetY) * limit) / distance;
    }
  }
  function tick(time: number) {
    frame = 0;
    if (disposed) return;
    const dt = previousTime === null ? 1 / 60 : (time - previousTime) / 1000;
    previousTime = time;
    const leanX = returning ? 0 : clamp((targetX - x.value) * 0.25, 8);
    const leanY = returning ? 0 : clamp((y.value - targetY) * 0.2, 6);
    if (!returning) limitLag();
    stepSpring(x, targetX, dt);
    stepSpring(y, targetY, dt);
    // Keep the visual close enough to the finger even during a fast swipe.
    if (!returning) limitLag();
    stepSpring(scale, targetScale, dt, 450, 26);
    stepSpring(tiltX, leanY, dt, 300, 24);
    stepSpring(tiltY, leanX, dt, 300, 24);
    stepSpring(rotation, returning ? 0 : leanX * 0.8, dt, 300, 24);
    const settled =
      resting(x, targetX, 0.15) &&
      resting(y, targetY, 0.15) &&
      resting(scale, targetScale, 0.001) &&
      resting(tiltX, 0, 0.05) &&
      resting(tiltY, 0, 0.05) &&
      resting(rotation, 0, 0.05);
    if (settled) {
      x.value = targetX;
      y.value = targetY;
      scale.value = targetScale;
      tiltX.value = tiltY.value = rotation.value = 0;
      render();
      const done = finish;
      finish = undefined;
      done?.();
    } else {
      render();
      frame = requestAnimationFrame(tick);
    }
  }
  function wake() {
    if (disposed) return;
    if (initial.reducedMotion) {
      x.value = targetX;
      y.value = targetY;
      scale.value = returning ? targetScale : 1;
      render();
      const done = finish;
      finish = undefined;
      done?.();
    } else if (!frame) {
      previousTime = null;
      frame = requestAnimationFrame(tick);
    }
  }
  render();
  return {
    moveTo(nextX: number, nextY: number) {
      targetX = nextX;
      targetY = nextY;
      wake();
    },
    returnTo(nextX: number, nextY: number, nextScale: number, onFinish: () => void) {
      returning = true;
      targetX = nextX;
      targetY = nextY;
      targetScale = nextScale;
      finish = onFinish;
      wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      finish = undefined;
    },
  };
}
