// Regras da tela da OS "uma etapa por vez": qual é a etapa da vez, o que cada etapa já tem
// e quando dá pra mostrar ao cliente. Puro (sem React) pra testar sem tela.
import { sectionOrder, type MediaItem, type SectionItem } from "@/components/os/types";
import { PHOTO_MEDIA_LABELS } from "./guidedSubmit";

/** As 4 etapas do caminho principal. Inspeção geral e Scanner são extras. */
export const MAIN_STEPS = ["checkin", "diagnosis", "repair", "final"] as const;
export type MainStep = (typeof MAIN_STEPS)[number];

export type StepView = {
  type: MainStep;
  section: SectionItem | null;
  state: "done" | "current" | "todo";
};

const isPublished = (s: SectionItem | null | undefined) => s?.status === "published";
const byType = (sections: SectionItem[], type: string) => sections.find((s) => s.type === type) ?? null;

/** Primeira etapa principal ainda não mostrada ao cliente; null = as 4 já foram. */
export function currentStep(sections: SectionItem[]): MainStep | null {
  return MAIN_STEPS.find((type) => !isPublished(byType(sections, type))) ?? null;
}

export function mainSteps(sections: SectionItem[]): StepView[] {
  const current = currentStep(sections);
  return MAIN_STEPS.map((type) => {
    const section = byType(sections, type);
    const state = isPublished(section) ? "done" : type === current ? "current" : "todo";
    return { type, section, state };
  });
}

/**
 * Etapas listadas embaixo do cartão "Agora": todas as que existem (fora o relato), na ordem do
 * ciclo, menos a da vez — inclusive rascunho fora de ordem, que nunca pode sumir da tela.
 */
export function listedSections(sections: SectionItem[]): SectionItem[] {
  const now = currentStep(sections);
  const order = (type: string) => {
    const i = sectionOrder.indexOf(type as (typeof sectionOrder)[number]);
    return i === -1 ? 99 : i;
  };
  return sections
    .filter((s) => s.type !== "intake" && s.type !== now)
    .sort((a, b) => order(a.type) - order(b.type));
}

const plural =(n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "explicação · 2 fotos · 1 teste" — o que a etapa já tem, num relance. */
export function sectionSummary(section: SectionItem | null): string {
  if (!section) return "Nada registrado ainda";
  const count = (type: string) => section.medias.filter((m) => m.type === type).length;
  const findings = section.tests.filter((t) => t.test_type === "achado_adicional").length;
  const tests = section.tests.length - findings;
  const parts = [
    section.notes?.trim() ? "explicação" : "",
    count("photo") ? plural(count("photo"), "foto", "fotos") : "",
    count("video") ? plural(count("video"), "vídeo", "vídeos") : "",
    count("audio") ? plural(count("audio"), "áudio", "áudios") : "",
    tests ? plural(tests, "teste", "testes") : "",
    findings ? plural(findings, "achado", "achados") : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nada registrado ainda";
}

/** Por que ainda não dá pra mostrar ao cliente (null = pode). */
export function publishBlocker(section: SectionItem | null): string | null {
  const empty = !section || (!section.notes?.trim() && section.medias.length === 0 && section.tests.length === 0);
  return empty ? "Fale, tire uma foto ou faça um teste antes de mostrar ao cliente." : null;
}

/** O que o mecânico falou/escreveu entra no fim da explicação — nunca apaga o que já tinha. */
export function appendNotes(previous: string | null, added: string): string {
  const prev = previous?.trim() ?? "";
  const add = added.trim();
  if (!add) return prev;
  return prev ? `${prev}\n${add}` : add;
}

/** Fotos de como o carro chegou: as 4 guiadas primeiro (frente, traseira, lados), depois as extras. */
export function checkinPhotos(sections: SectionItem[]): MediaItem[] {
  const photos = (byType(sections, "checkin")?.medias ?? []).filter((m) => m.type === "photo");
  const guided: string[] = Object.values(PHOTO_MEDIA_LABELS);
  const rank = (m: MediaItem) => {
    const i = guided.indexOf(m.label ?? "");
    return i === -1 ? guided.length : i;
  };
  return [...photos].sort((a, b) => rank(a) - rank(b));
}
