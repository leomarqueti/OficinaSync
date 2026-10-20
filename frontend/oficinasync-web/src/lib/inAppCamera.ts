/** true quando dá pra abrir a câmera dentro da página (sem sair pro app de câmera). */
export const canUseInAppCamera = () =>
  typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
