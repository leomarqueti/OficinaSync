import { useState, type ReactNode } from "react";
import { useMe } from "@/lib/me";
import { modeFor, readModePreference, saveModePreference, type AppMode } from "@/lib/mode";
import { ControlShell } from "./ControlShell";
import { ModeContext } from "./ModeContext";
import { SimpleShell } from "./SimpleShell";
import { shellFor } from "./shellFor";

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Escolhe a "cara" do sistema pelo cargo (mecânico → simples; escritório → controle; dono escolhe). */
export function AppShell({ children }: { children: ReactNode }) {
  const { me, loading } = useMe();
  // escolha feita nesta tela; sem ela, lê o storage na hora (síncrono) — nunca renderiza o modo errado antes
  const [override, setOverride] = useState<AppMode | null>(null);
  const preference = override ?? (me ? readModePreference(safeStorage(), me.user_id) : null);

  const mode = me ? modeFor(me.role, preference) : null;
  const shell = shellFor(loading, Boolean(me), mode);

  const value = {
    mode: mode ?? "control",
    canSwitch: me?.role === "owner",
    setMode: (next: AppMode) => {
      if (!me || me.role !== "owner") return;
      saveModePreference(safeStorage(), me.user_id, next);
      setOverride(next);
    },
  };

  if (shell === "loading") {
    return (
      <div className="app-glow flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <ModeContext.Provider value={value}>
      {shell === "simple" ? <SimpleShell>{children}</SimpleShell> : <ControlShell>{children}</ControlShell>}
    </ModeContext.Provider>
  );
}
