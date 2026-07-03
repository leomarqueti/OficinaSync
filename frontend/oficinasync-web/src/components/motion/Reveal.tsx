import { motion, useReducedMotion } from "motion/react";

type RevealProps = {
  children: React.ReactNode;
  /** Atraso em segundos (pra sequenciar elementos próximos). */
  delay?: number;
  /** Distância do slide-up em px. */
  y?: number;
  className?: string;
};

/**
 * Revela o conteúdo (fade + slide-up) quando ele entra na tela.
 * Base do scrollytelling — cada capítulo da história usa isso.
 */
export function Reveal({ children, delay = 0, y = 28, className }: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
