const MB = 1024 * 1024;

/** Teto duro aplicado pelo multer antes de o arquivo inteiro ir pra memória (maior limite por tipo). */
export const HARD_UPLOAD_LIMIT_BYTES = 100 * MB;

export type UploadKind = 'foto' | 'áudio' | 'vídeo';

export function uploadLimitFor(mime: string): {
  kind: UploadKind;
  maxBytes: number;
} {
  if (mime.startsWith('image/')) return { kind: 'foto', maxBytes: 15 * MB };
  if (mime.startsWith('audio/')) return { kind: 'áudio', maxBytes: 20 * MB };
  return { kind: 'vídeo', maxBytes: 100 * MB };
}

/** `null` se o tamanho está dentro do limite do tipo; senão a mensagem de erro em português. */
export function checkUploadSize(mime: string, sizeBytes: number): string | null {
  const { kind, maxBytes } = uploadLimitFor(mime);

  if (sizeBytes > maxBytes) {
    return `Arquivo de ${kind} muito grande. O limite é ${maxBytes / MB} MB.`;
  }

  return null;
}

/** Fechar exatamente a cota é permitido; passar de 1 byte já estoura. */
export function exceedsQuota(
  usedBytes: number,
  incomingBytes: number,
  quotaBytes: number,
): boolean {
  return usedBytes + incomingBytes > quotaBytes;
}
