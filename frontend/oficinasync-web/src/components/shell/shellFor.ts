import type { AppMode } from "@/lib/mode";

/** Decide a casca. Sem usuário depois de carregar = cai no controle (a página trata o 401). */
export function shellFor(loading: boolean, hasMe: boolean, mode: AppMode | null): "loading" | "simple" | "control" {
  if (loading && !hasMe) return "loading";
  if (hasMe && mode) return mode;
  return "control";
}
