import { attemptOverLimit, attemptReachesLimit, isPinLocked, isWeakPin, normalizePhone, PIN_LOCK_MS } from './pin-policy';

describe('regras do PIN', () => {
  it.each(['000000', '111111', '123456', '654321', '012345', '121212', '112233', '123123'])(
    '%s é fraco',
    (pin) => expect(isWeakPin(pin)).toBe(true),
  );

  it.each(['482915', '907364'])('%s é aceito', (pin) => expect(isWeakPin(pin)).toBe(false));

  it.each(['12345', '12345a', '1234567', ''])('"%s" (formato inválido) conta como fraco', (pin) =>
    expect(isWeakPin(pin)).toBe(true),
  );

  it('a 5ª tentativa errada trava; da 6ª em diante nem confere o PIN', () => {
    expect(attemptReachesLimit(4)).toBe(false);
    expect(attemptReachesLimit(5)).toBe(true);
    expect(attemptOverLimit(5)).toBe(false);
    expect(attemptOverLimit(6)).toBe(true);
    expect(PIN_LOCK_MS).toBe(15 * 60 * 1000);
  });

  it('trava vale até a hora e solta depois', () => {
    const until = new Date('2026-10-22T12:15:00Z');
    expect(isPinLocked(until, new Date('2026-10-22T12:14:59Z'))).toBe(true);
    expect(isPinLocked(until, new Date('2026-10-22T12:15:01Z'))).toBe(false);
    expect(isPinLocked(null, new Date())).toBe(false);
  });

  it('celular em formatos diferentes vira o mesmo número', () => {
    expect(normalizePhone('+55 14 99999-0000')).toBe('+5514999990000');
    expect(normalizePhone('+5514999990000')).toBe('+5514999990000');
  });
});
