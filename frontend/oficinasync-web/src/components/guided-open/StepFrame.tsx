import { ArrowLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { BigButton } from "@/components/kit";

/** Moldura de cada tela: progresso, voltar grande, título e o botão de continuar (com o que falta). */
export function StepFrame({
  index,
  total,
  title,
  subtitle,
  onBack,
  next,
  children,
}: {
  index: number;
  total: number;
  title: string;
  subtitle?: string;
  onBack: () => void;
  next?: { label?: string; disabled: boolean; hint?: string; onNext: () => void; loading?: boolean };
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="app-glow min-h-screen text-foreground">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-6 pt-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-base font-semibold text-white/80"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            {index === 0 ? "Sair" : "Voltar"}
          </button>
          <span className="text-sm font-semibold text-white/60">
            {index + 1} de {total}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>

        <motion.div
          key={title}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 pt-6"
        >
          <h1 className="font-display text-3xl font-extrabold uppercase leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-base text-white/70">{subtitle}</p>}
          <div className="pt-5">{children}</div>
        </motion.div>

        {next && (
          <div className="sticky bottom-0 mt-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent pb-2 pt-4">
            <BigButton size="hero" disabled={next.disabled || next.loading} hint={next.loading ? undefined : next.hint} onClick={next.onNext}>
              {next.loading ? "Enviando..." : (next.label ?? "Continuar")}
            </BigButton>
          </div>
        )}
      </div>
    </div>
  );
}
