// Rascunho da abertura de OS: o balcão é interrompido toda hora (telefone, cliente chegando).
// O que foi digitado fica guardado no aparelho e volta quando a pessoa reabre a tela.
// Fotos NÃO entram (arquivo não cabe no storage) — só os textos e as escolhas.

export const DRAFT_KEY = "oficinasync_os_draft";
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type OsDraft = {
  step: number;
  quickMode: boolean;
  fields: Record<string, string>;
  answers: Record<string, string>;
  selectedClientId: number | null;
  selectedCarId: number | null;
};

type Stored = { savedAt: number; draft: OsDraft };

export function hasDraftContent(draft: OsDraft): boolean {
  return (
    draft.selectedClientId !== null ||
    Object.values(draft.fields).some((v) => v.trim() !== "") ||
    Object.values(draft.answers).some((v) => v.trim() !== "")
  );
}

export function saveOsDraft(storage: Pick<Storage, "setItem">, draft: OsDraft, now = Date.now()): void {
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: now, draft } satisfies Stored));
  } catch {
    // storage cheio/bloqueado: segue sem rascunho
  }
}

export function loadOsDraft(storage: Pick<Storage, "getItem">, now = Date.now()): OsDraft | null {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (typeof parsed.savedAt !== "number" || !parsed.draft) return null;
    if (now - parsed.savedAt > DRAFT_MAX_AGE_MS) return null;
    return parsed.draft;
  } catch {
    return null;
  }
}

export function clearOsDraft(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // nada a limpar
  }
}
