"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedStatProps {
  value: number;
  duration?: number;
}

export function AnimatedStat({ value, duration = 800 }: AnimatedStatProps) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(value);
  const displayRef = useRef(0);

  useEffect(() => {
    // Skip if value hasn't changed (re-render without new data)
    if (prevValue.current === value && displayRef.current === value) return;

    const from = displayRef.current;
    const to = value;
    prevValue.current = value;

    if (to === 0) {
      setDisplay(0);
      displayRef.current = 0;
      return;
    }

    const start = performance.now();

    let rafId: number;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + eased * (to - from));
      setDisplay(current);
      displayRef.current = current;

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    }

    rafId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return <span>{display}</span>;
}
