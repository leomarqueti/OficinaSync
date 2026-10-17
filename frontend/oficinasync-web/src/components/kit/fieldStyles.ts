/** Visual único de campo (input/select/textarea): 48px de altura, texto 16px (iPhone não dá zoom). */
export const fieldClass =
  "h-12 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-base text-foreground placeholder:text-white/50 outline-none transition-colors focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60";

/** Versão compacta pra tabelas e linhas densas (quantidade, porcentagem, datas de filtro). */
export const fieldClassCompact =
  "h-10 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40";

export const textAreaClass = fieldClass.replace("h-12", "min-h-28 py-3");
