import { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';

// Contador animado 0 -> value al entrar en viewport.
// Código propio (sin dependencias externas): usa el framer-motion
// que ya trae el proyecto. Respeta prefers-reduced-motion.
export default function CountUp({
  value,
  duration = 1.2,
}: {
  value: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const target = Number.isFinite(value) ? value : 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (ref.current) ref.current.textContent = String(Math.round(target));
      return;
    }
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return <span ref={ref}>0</span>;
}
