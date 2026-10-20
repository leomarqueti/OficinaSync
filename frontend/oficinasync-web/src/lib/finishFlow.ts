// Finalização da OS no mesmo padrão da abertura guiada: uma pergunta por tela, texto guardado
// como rascunho (não se perde se o app fechar) e envio em fila que continua de onde parou.
import { PHOTO_LABELS, PHOTO_SIDES, type PhotoSide } from "./guidedOpen";

export type FinishVerdict = "resolved" | "partial" | "not_resolved";
export type FinishStep = "verdict" | "cause" | "conclusion" | "photos" | "review";
export const FINISH_STEPS: FinishStep[] = ["verdict", "cause", "conclusion", "photos", "review"];

export type FinishState = {
  verdict: FinishVerdict | null;
  rootCause: string;
  conclusion: string;
  photos: Record<PhotoSide, boolean>;
  extraPhotos: number;
};

export const emptyFinishState = (): FinishState => ({
  verdict: null,
  rootCause: "",
  conclusion: "",
  photos: { front: false, rear: false, left: false, right: false },
  extraPhotos: 0,
});

export const VERDICT_LABELS: Record<FinishVerdict, string> = {
  resolved: "Resolvido",
  partial: "Resolvido em parte",
  not_resolved: "Não resolvido",
};

/** O que falta pra seguir desta tela (vira o aviso embaixo do botão). */
export function finishMissing(step: FinishStep, state: FinishState): string[] {
  if (step === "verdict") return state.verdict ? [] : ["como terminou"];
  if (step === "photos") return PHOTO_SIDES.filter((s) => !state.photos[s]).map((s) => `foto ${PHOTO_LABELS[s]}`);
  return [];
}

/* ------------------------- rascunho ------------------------- */

const DRAFT_MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const draftKey = (orderId: number) => `oficinasync_finish_draft_${orderId}`;

export type FinishDraft = { state: FinishState; step: FinishStep };

export function saveFinishDraft(storage: Storage, orderId: number, draft: FinishDraft, now = Date.now()) {
  try {
    storage.setItem(draftKey(orderId), JSON.stringify({ ...draft, savedAt: now }));
  } catch {
    // sem espaço / bloqueado: segue sem rascunho
  }
}

export function loadFinishDraft(storage: Storage, orderId: number, now = Date.now()): FinishDraft | null {
  try {
    const raw = storage.getItem(draftKey(orderId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FinishDraft & { savedAt?: number };
    if (!parsed.savedAt || now - parsed.savedAt > DRAFT_MAX_AGE_MS) return null;
    if (!FINISH_STEPS.includes(parsed.step)) return null;
    return { state: { ...emptyFinishState(), ...parsed.state }, step: parsed.step };
  } catch {
    return null;
  }
}

export function clearFinishDraft(storage: Storage, orderId: number) {
  try {
    storage.removeItem(draftKey(orderId));
  } catch {
    // nada
  }
}

/* ------------------------- envio ------------------------- */

export const EXIT_PHOTO_LABELS: Record<PhotoSide, string> = {
  front: "Frente na saída",
  rear: "Traseira na saída",
  left: "Lado esquerdo na saída",
  right: "Lado direito na saída",
};

export type FinishFiles = { photos: Record<PhotoSide, File | null>; extraPhotos: File[] };
export type FinishProgress = { finalSectionId?: number; published?: boolean; uploaded: string[] };
export type FinishDeps = {
  json: (method: "POST" | "PATCH", path: string, body?: unknown) => Promise<Record<string, unknown>>;
  upload: (file: File, label: string, sectionId: number) => Promise<void>;
};

/**
 * Etapa final (usa a que existe ou cria) → fotos de saída UMA POR VEZ (o servidor aceita 4 envios
 * simultâneos no total) → publica → finaliza. `progress` lembra o que já foi feito: se cair no meio,
 * chamar de novo continua dali sem repetir nada.
 */
export async function submitFinish(
  orderId: number,
  finalSection: { section_id: number; status: string } | null,
  state: FinishState,
  files: FinishFiles,
  progress: FinishProgress,
  deps: FinishDeps,
): Promise<void> {
  const conclusion = state.conclusion.trim();
  const rootCause = state.rootCause.trim();

  if (!progress.finalSectionId) {
    if (finalSection) {
      progress.finalSectionId = finalSection.section_id;
      progress.published = finalSection.status === "published";
    } else {
      const created = await deps.json("POST", "/sections", {
        service_order_id: orderId,
        type: "final",
        notes: conclusion || "Registro final da entrega do veículo.",
      });
      progress.finalSectionId = created.section_id as number;
    }
  }
  const sectionId = progress.finalSectionId;

  const uploadOnce = async (file: File | null, label: string) => {
    if (!file || progress.uploaded.includes(label)) return;
    await deps.upload(file, label, sectionId);
    progress.uploaded.push(label);
  };
  for (const side of PHOTO_SIDES) await uploadOnce(files.photos[side], EXIT_PHOTO_LABELS[side]);
  for (const [i, file] of files.extraPhotos.entries()) await uploadOnce(file, `Detalhe na saída ${i + 1}`);

  if (!progress.published) {
    await deps.json("PATCH", `/sections/${sectionId}/publish`);
    progress.published = true;
  }

  await deps.json("PATCH", `/service_orders/${orderId}/finish`, {
    ...(rootCause ? { root_cause: rootCause } : {}),
    ...(conclusion ? { conclusion } : {}),
    ...(state.verdict ? { final_verdict: state.verdict } : {}),
  });
}
