// Espejo JS de src/styles/motion.css — usar SIEMPRE estos tokens en framer-motion.
// Ninguna duración supera MAX (250ms). Solo transform y opacity.

export const DUR = {
  tap: 0.1, // :active scale — ver clase .tap-feedback en motion.css
  overlay: 0.15, // fade de overlays
  swap: 0.2, // crossfade
  max: 0.25, // techo (shared element)
} as const;

export const EASE_IN_OUT = 'easeInOut' as const;

/** Crossfade 200ms con solapamiento (usar con AnimatePresence popLayout/sync). */
export const crossfade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DUR.swap, ease: EASE_IN_OUT },
} as const;

/** Fade 150ms para overlays de modal/menú. */
export const overlayFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DUR.overlay, ease: EASE_IN_OUT },
} as const;
