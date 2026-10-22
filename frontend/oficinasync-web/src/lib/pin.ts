// Espelho de backend/src/modules/users/pin-policy.ts: a tela avisa do PIN fraco antes de enviar
// (o servidor recusa de qualquer jeito). Mudou lá, muda aqui.

const COMMON = new Set(["112233", "123123", "121212", "696969", "101010", "000000", "102030", "147258", "159753"]);

function isSequence(pin: string, step: 1 | -1): boolean {
  for (let i = 1; i < pin.length; i++) {
    if (Number(pin[i]) - Number(pin[i - 1]) !== step) return false;
  }
  return true;
}

function isRepeating(pin: string): boolean {
  return [1, 2, 3].some((size) => pin === pin.slice(0, size).repeat(pin.length / size));
}

/** true = PIN recusado: formato inválido, repetido, em sequência ou comum demais. */
export function isWeakPin(pin: string): boolean {
  if (!/^\d{6}$/.test(pin)) return true;
  return COMMON.has(pin) || isRepeating(pin) || isSequence(pin, 1) || isSequence(pin, -1);
}
