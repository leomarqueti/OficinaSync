import { createContext, useContext } from "react";
import type { AppMode } from "@/lib/mode";

export type ShellMode = { mode: AppMode; canSwitch: boolean; setMode: (mode: AppMode) => void };

export const ModeContext = createContext<ShellMode>({ mode: "control", canSwitch: false, setMode: () => undefined });

/** Modo atual da casca (simples/controle). Só o dono pode trocar. */
export const useShellMode = () => useContext(ModeContext);
