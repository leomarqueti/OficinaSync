import { clearMeCache } from "./me";

/** Sai da conta (usado no menu lateral e na tela "Eu" do modo simples). */
export function logout(navigate: (to: string) => void): void {
  try {
    localStorage.removeItem("token");
  } catch {
    // storage bloqueado: nada a remover
  }
  clearMeCache();
  navigate("/login");
}
