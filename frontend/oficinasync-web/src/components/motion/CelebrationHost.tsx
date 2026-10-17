import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";
import { Celebrate } from "./Celebrate";
import { CELEBRATE_EVENT } from "./celebration";

/** Camada por cima de tudo que mostra a comemoração por 1,4s. Não bloqueia cliques. */
export function CelebrationHost() {
  const [current, setCurrent] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onCelebrate = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      haptic();
      setCurrent({ id: Date.now(), message });
      clearTimeout(timer);
      timer = setTimeout(() => setCurrent(null), 1400);
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => {
      window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
        >
          <Celebrate message={current.message} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
