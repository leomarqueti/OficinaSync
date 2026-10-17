import type { Role } from "./me";

/** "simple" = mecânico (botões grandes, poucos passos); "control" = escritório/dono (dados e controle). */
export type AppMode = "simple" | "control";

export const modeKey = (userId: number) => `oficinasync_mode_${userId}`;

/** Fonte única de qual "cara" do sistema cada pessoa vê. Só o dono escolhe. */
export function modeFor(role: Role, ownerPreference: AppMode | null): AppMode {
  if (role === "mechanic") return "simple";
  if (role === "receptionist") return "control";
  return ownerPreference ?? "control";
}

export function readModePreference(
  storage: Pick<Storage, "getItem"> | null | undefined,
  userId: number,
): AppMode | null {
  try {
    const value = storage?.getItem(modeKey(userId));
    return value === "simple" || value === "control" ? value : null;
  } catch {
    return null;
  }
}

export function saveModePreference(
  storage: Pick<Storage, "setItem"> | null | undefined,
  userId: number,
  mode: AppMode,
): void {
  try {
    storage?.setItem(modeKey(userId), mode);
  } catch {
    // sem storage (aba anônima/bloqueado): a escolha vale só até recarregar
  }
}
