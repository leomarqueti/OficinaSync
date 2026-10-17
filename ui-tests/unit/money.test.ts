import { describe, expect, it } from 'vitest';
import { parseMoneyBR } from '../../frontend/oficinasync-web/src/lib/money';

describe('parseMoneyBR (valores digitados no formato brasileiro)', () => {
  it('milhar com ponto e centavos com vírgula', () => {
    expect(parseMoneyBR('1.200')).toBe(1200);
    expect(parseMoneyBR('1.200,50')).toBe(1200.5);
    expect(parseMoneyBR('1.234.567,89')).toBe(1234567.89);
  });

  it('vírgula decimal e ponto decimal simples', () => {
    expect(parseMoneyBR('25,5')).toBe(25.5);
    expect(parseMoneyBR('12.5')).toBe(12.5);
    expect(parseMoneyBR('0')).toBe(0);
    expect(parseMoneyBR('150')).toBe(150);
  });

  it('aceita R$ e espaços', () => {
    expect(parseMoneyBR('R$ 50')).toBe(50);
    expect(parseMoneyBR(' R$1.200,00 ')).toBe(1200);
  });

  it('lixo, vazio e negativo → null (nunca NaN, nunca valor errado)', () => {
    expect(parseMoneyBR('abc')).toBeNull();
    expect(parseMoneyBR('')).toBeNull();
    expect(parseMoneyBR('  ')).toBeNull();
    expect(parseMoneyBR('-3')).toBeNull();
    expect(parseMoneyBR('1,2,3')).toBeNull();
    expect(parseMoneyBR('12,345')).toBe(12.345); // quem barra 3 casas é o servidor; o parser não inventa
  });
});
