type Vibrator = { vibrate?: (pattern: number) => boolean };

/** true quando a pessoa configurou o aparelho pra reduzir movimento. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Vibração curta de confirmação (sente o toque mesmo de mão suja). Silenciosa onde não existe. */
export function haptic(
  nav: Vibrator | undefined = typeof navigator === "undefined" ? undefined : (navigator as Vibrator),
  reduced: boolean = prefersReducedMotion(),
): void {
  if (reduced || !nav?.vibrate) return;
  try {
    nav.vibrate(10);
  } catch {
    // alguns navegadores recusam vibrar sem gesto do usuário — não é erro pra quem usa
  }
}
