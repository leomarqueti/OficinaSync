import { describe, expect, it } from 'vitest';
import {
  e164ToDigits,
  formatCnpj,
  formatCpf,
  formatKm,
  formatPhone,
  formatPlate,
  isStrongPassword,
  isValidCnpj,
  isValidCpf,
  isValidPhone,
  isValidPlate,
  isValidYear,
  onlyDigits,
  phoneToE164,
} from '../../frontend/oficinasync-web/src/lib/validators';

describe('CPF', () => {
  it('aceita CPF válido com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('recusa dígito verificador errado, tamanho errado e sequência repetida', () => {
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('formata enquanto digita e descarta o que passa de 11 dígitos', () => {
    expect(formatCpf('5299')).toBe('529.9');
    expect(formatCpf('52998224725999')).toBe('529.982.247-25');
  });
});

describe('CNPJ', () => {
  it('aceita CNPJ válido e recusa dígito errado ou sequência repetida', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('00000000000000')).toBe(false);
  });

  it('formata com máscara', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });
});

describe('telefone', () => {
  it('o usuário nunca digita +55: o E.164 é montado por baixo', () => {
    expect(phoneToE164('(14) 99795-1011')).toBe('+5514997951011');
    expect(e164ToDigits('+5514997951011')).toBe('14997951011');
  });

  it('formata celular (11 dígitos) e fixo (10 dígitos)', () => {
    expect(formatPhone('14997951011')).toBe('(14) 99795-1011');
    expect(formatPhone('1433334444')).toBe('(14) 3333-4444');
  });

  it('valida só 10 ou 11 dígitos — e o E.164 cru NÃO é válido (precisa normalizar antes)', () => {
    expect(isValidPhone('14997951011')).toBe(true);
    expect(isValidPhone('1433334444')).toBe(true);
    expect(isValidPhone('149979510')).toBe(false);
    // regressão documentada no CLAUDE.md: passar o E.164 cru pro validador sempre falha
    expect(isValidPhone('+5514997951011')).toBe(false);
    expect(isValidPhone(e164ToDigits('+5514997951011'))).toBe(true);
  });
});

describe('placa', () => {
  it('aceita o padrão antigo e o Mercosul', () => {
    expect(isValidPlate('ABC-1234')).toBe(true);
    expect(isValidPlate('abc1d23')).toBe(true);
  });

  it('recusa formato inválido', () => {
    expect(isValidPlate('AB-12345')).toBe(false);
    expect(isValidPlate('1234567')).toBe(false);
  });

  it('formata: hífen no padrão antigo, sem hífen no Mercosul, sempre maiúscula', () => {
    expect(formatPlate('abc1234')).toBe('ABC-1234');
    expect(formatPlate('abc1d23')).toBe('ABC1D23');
  });
});

describe('ano, km, senha e dígitos', () => {
  it('ano: de 1950 até o ano que vem', () => {
    const year = new Date().getFullYear();
    expect(isValidYear('1950')).toBe(true);
    expect(isValidYear(String(year + 1))).toBe(true);
    expect(isValidYear('1949')).toBe(false);
    expect(isValidYear(String(year + 2))).toBe(false);
    expect(isValidYear('20x5')).toBe(false);
  });

  it('km: separador de milhar e no máximo 7 dígitos', () => {
    expect(formatKm('125000')).toBe((125000).toLocaleString('pt-BR'));
    expect(formatKm('')).toBe('');
    expect(formatKm('123456789')).toBe((1234567).toLocaleString('pt-BR'));
  });

  it('senha forte exige 8+ caracteres, minúscula, maiúscula, número e símbolo', () => {
    expect(isStrongPassword('Teste@12345')).toBe(true);
    expect(isStrongPassword('teste@12345')).toBe(false);
    expect(isStrongPassword('Teste12345')).toBe(false);
    expect(isStrongPassword('Te@1')).toBe(false);
  });

  it('onlyDigits tira tudo que não é dígito', () => {
    expect(onlyDigits('(14) 99795-1011')).toBe('14997951011');
  });
});
