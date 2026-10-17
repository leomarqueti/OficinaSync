import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipTone = "ok" | "alert" | "neutral" | "danger";

const TONES: Record<ChipTone, string> = {
  ok: "bg-brand/15 text-brand",
  alert: "bg-warning/15 text-warning",
  neutral: "bg-white/10 text-white/80",
  danger: "bg-danger/15 text-danger",
};

/** Limão = tudo certo · amarelo = atenção · vermelho = erro. */
export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      data-tone={tone}
      className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide", TONES[tone])}
    >
      {children}
    </span>
  );
}
