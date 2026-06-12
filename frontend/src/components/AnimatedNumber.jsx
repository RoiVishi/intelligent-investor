import { useEffect, useRef, useState } from 'react';

const ANIMATION_MS = 650;

function animationsEnabled() {
  if (import.meta.env?.MODE === 'test') {
    return false;
  }

  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

// Counts the displayed number up/down toward the target value with ease-out.
export default function AnimatedNumber({ value, format }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;

    if (from === target || !animationsEnabled()) {
      setDisplay(target);
      return undefined;
    }

    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min((now - start) / ANIMATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    // Hidden tabs never fire requestAnimationFrame; guarantee the final value.
    const fallback = setTimeout(() => setDisplay(target), ANIMATION_MS + 120);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fallback);
    };
  }, [target]);

  return format ? format(display) : display;
}
