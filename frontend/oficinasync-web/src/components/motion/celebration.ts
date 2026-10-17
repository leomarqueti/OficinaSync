export const CELEBRATE_EVENT = "oficinasync:celebrate";

/** Pede uma comemoração na tela (o CelebrationHost, montado no App, mostra). */
export function celebrate(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(CELEBRATE_EVENT, { detail: message }));
}
