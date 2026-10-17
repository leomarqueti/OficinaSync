import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const CONFETTI = [
  { x: -90, y: -70, color: "#a3e635" },
  { x: 80, y: -80, color: "#facc15" },
  { x: -70, y: 50, color: "#fafafa" },
  { x: 95, y: 40, color: "#a3e635" },
  { x: 10, y: -100, color: "#facc15" },
  { x: -110, y: -10, color: "#a3e635" },
];

/** Comemoração curta: visto que "estoura" + onda + confete. Só depois de a ação dar certo de verdade. */
export function Celebrate({ message, reduced: forced }: { message: string; reduced?: boolean }) {
  const prefers = useReducedMotion();
  const reduced = forced ?? prefers ?? false;

  return (
    <div role="status" className="pointer-events-none relative flex flex-col items-center gap-3 py-4">
      <motion.div
        initial={reduced ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 16 }}
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand text-brand-foreground"
      >
        <Check className="h-10 w-10" strokeWidth={3} aria-hidden="true" />
        {!reduced && (
          <motion.span
            data-ring
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="absolute inset-0 rounded-full border-[3px] border-brand"
          />
        )}
      </motion.div>
      <p className="font-display text-xl font-extrabold uppercase tracking-wide">{message}</p>
      {!reduced &&
        CONFETTI.map((piece, i) => (
          <motion.i
            key={i}
            data-confetti
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: piece.x, y: piece.y, opacity: 0, rotate: 320 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="absolute left-1/2 top-10 h-2 w-2 rounded-sm"
            style={{ background: piece.color }}
          />
        ))}
    </div>
  );
}
