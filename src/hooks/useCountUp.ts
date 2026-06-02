import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);
  const frameRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    const from = prevTarget.current;
    const to = target;
    prevTarget.current = target;
    if (from === to) return;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(from + (to - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(to);
      }
    };

    startRef.current = undefined;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration]);

  return value;
}


