/**
 * Tons e mapeamentos de status (não-componentes) do tema Cinema Escuro,
 * separados dos componentes de chip por causa do fast-refresh.
 */

export const tone = {
  emerald: "bg-emerald-400/10 text-emerald-300 border-emerald-400/25",
  red: "bg-red-400/10 text-red-300 border-red-400/25",
  amber: "bg-amber-400/10 text-amber-300 border-amber-400/25",
  blue: "bg-blue-400/10 text-blue-300 border-blue-400/25",
  neutral: "bg-white/5 text-white/60 border-white/10",
} as const;

export type Tone = keyof typeof tone;

export function itemStatusColor(status: string | null | undefined): Tone {
  if (status === "approved") return "emerald";
  if (status === "failed") return "red";
  if (status === "inconclusive") return "amber";
  return "neutral";
}

export const itemStatusLabel: Record<string, string> = {
  approved: "OK",
  failed: "Crítico",
  inconclusive: "Atenção",
};
