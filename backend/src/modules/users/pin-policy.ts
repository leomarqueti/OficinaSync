// Regras do PIN de 6 dígitos do funcionário (entrar com celular + PIN).
// Puro e testado à parte: PIN fraco é recusado e 5 erros seguidos travam a conta por 15 minutos.

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 15 * 60 * 1000;

const COMMON = new Set(['112233', '123123', '121212', '696969', '101010', '000000', '102030', '147258', '159753']);

function isSequence(pin: string, step: 1 | -1): boolean {
  for (let i = 1; i < pin.length; i++) {
    if (Number(pin[i]) - Number(pin[i - 1]) !== step) return false;
  }
  return true;
}

/** Repete um bloco de 1, 2 ou 3 dígitos (111111, 121212, 123123). */
function isRepeating(pin: string): boolean {
  return [1, 2, 3].some((size) => pin === pin.slice(0, size).repeat(pin.length / size));
}

/** true = recusar: formato inválido, todos iguais, sequência, bloco repetido ou da lista comum. */
export function isWeakPin(pin: string): boolean {
  if (!/^\d{6}$/.test(pin)) return true;
  return COMMON.has(pin) || isRepeating(pin) || isSequence(pin, 1) || isSequence(pin, -1);
}

/** Mais um PIN errado: na 5ª falha trava por 15 minutos e o contador recomeça. */
export function registerPinFailure(attempts: number, now: Date): { attempts: number; lockedUntil: Date | null } {
  const next = attempts + 1;
  if (next >= PIN_MAX_ATTEMPTS) return { attempts: 0, lockedUntil: new Date(now.getTime() + PIN_LOCK_MS) };
  return { attempts: next, lockedUntil: null };
}

export function isPinLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil != null && lockedUntil.getTime() > now.getTime();
}
