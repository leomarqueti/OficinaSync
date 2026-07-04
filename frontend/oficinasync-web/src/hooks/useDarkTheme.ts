import { useEffect } from "react";

/**
 * Ativa o tema Cinema Escuro na página inteira (incluindo overlays via
 * portal — Sheet/Dialog/AlertDialog do Radix renderizam em document.body,
 * fora de qualquer wrapper `className="dark"` local, então precisam da
 * classe no <body> pra herdar os tokens escuros).
 */
export function useDarkTheme() {
  useEffect(() => {
    document.body.classList.add("dark");
    return () => document.body.classList.remove("dark");
  }, []);
}
