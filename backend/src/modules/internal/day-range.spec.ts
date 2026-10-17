import { brtDayEnd, brtDayStart, brtMonthStart } from './day-range';

describe('intervalo de dias no horário de Brasília (UTC-3, sem horário de verão)', () => {
  it("'2026-10-17' começa à meia-noite de Brasília (03:00 UTC) e termina às 23:59:59.999 de Brasília", () => {
    expect(brtDayStart('2026-10-17').toISOString()).toBe('2026-10-17T03:00:00.000Z');
    expect(brtDayEnd('2026-10-17').toISOString()).toBe('2026-10-18T02:59:59.999Z');
  });

  it('uma OS fechada às 22h de Brasília (01h UTC do dia seguinte) ainda é do dia de Brasília', () => {
    const closedAt = new Date('2026-10-18T01:00:00.000Z'); // 22:00 do dia 17 em Brasília
    expect(closedAt >= brtDayStart('2026-10-17')).toBe(true);
    expect(closedAt <= brtDayEnd('2026-10-17')).toBe(true);
    expect(closedAt <= brtDayEnd('2026-10-18')).toBe(true);
    expect(closedAt >= brtDayStart('2026-10-18')).toBe(false);
  });

  it('virada de mês: 23h do último dia em Brasília continua no mês certo', () => {
    const closedAt = new Date('2026-11-01T02:00:00.000Z'); // 23:00 de 31/10 em Brasília
    expect(closedAt <= brtDayEnd('2026-10-31')).toBe(true);
    expect(closedAt >= brtDayStart('2026-11-01')).toBe(false);
  });

  it('início do mês de Brasília a partir de um instante', () => {
    // 02:00 UTC de 01/11 ainda é 31/10 em Brasília → mês de outubro
    expect(brtMonthStart(new Date('2026-11-01T02:00:00.000Z')).toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(brtMonthStart(new Date('2026-11-01T05:00:00.000Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  it('valor que não é data cai no new Date comum (a validação do DTO já barra antes)', () => {
    expect(Number.isNaN(brtDayStart('ontem').getTime())).toBe(true);
  });
});
