import { isPinLocked, isWeakPin, PIN_LOCK_MS, registerPinFailure } from './pin-policy';

describe('regras do PIN', () => {
  it.each(['000000', '111111', '123456', '654321', '012345', '121212', '112233', '123123'])(
    '%s é fraco',
    (pin) => expect(isWeakPin(pin)).toBe(true),
  );

  it.each(['482915', '907364'])('%s é aceito', (pin) => expect(isWeakPin(pin)).toBe(false));

  it.each(['12345', '12345a', '1234567', ''])('"%s" (formato inválido) conta como fraco', (pin) =>
    expect(isWeakPin(pin)).toBe(true),
  );

  it('4 erros ainda não travam', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    expect(registerPinFailure(3, now)).toEqual({ attempts: 4, lockedUntil: null });
  });

  it('o 5º erro trava por 15 minutos e zera o contador', () => {
    const now = new Date('2026-10-22T12:00:00Z');
    const r = registerPinFailure(4, now);
    expect(r.attempts).toBe(0);
    expect(r.lockedUntil?.getTime()).toBe(now.getTime() + PIN_LOCK_MS);
    expect(PIN_LOCK_MS).toBe(15 * 60 * 1000);
  });

  it('trava vale até a hora e solta depois', () => {
    const until = new Date('2026-10-22T12:15:00Z');
    expect(isPinLocked(until, new Date('2026-10-22T12:14:59Z'))).toBe(true);
    expect(isPinLocked(until, new Date('2026-10-22T12:15:01Z'))).toBe(false);
    expect(isPinLocked(null, new Date())).toBe(false);
  });
});
