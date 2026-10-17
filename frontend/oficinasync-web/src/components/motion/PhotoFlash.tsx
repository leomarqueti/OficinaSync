import { motion, useReducedMotion } from "motion/react";

/** Flash branco rápido por cima da foto recém-tirada. Troque `flashKey` (1, 2, 3...) a cada foto. */
export function PhotoFlash({ flashKey }: { flashKey: number }) {
  const reduced = useReducedMotion();
  if (!flashKey || reduced) return null;
  return (
    <motion.div
      key={flashKey}
      data-photo-flash
      aria-hidden="true"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white"
    />
  );
}
