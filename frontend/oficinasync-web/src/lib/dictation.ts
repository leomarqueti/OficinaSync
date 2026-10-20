// Fala → texto pelo reconhecimento de voz do próprio navegador (grátis, sem serviço pago).
// Chrome/Android expõem com prefixo webkit; onde não existe, o botão de falar some.

export type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognition(win: unknown = typeof window === "undefined" ? undefined : window): SpeechCtor | null {
  if (!win || typeof win !== "object") return null;
  const w = win as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
