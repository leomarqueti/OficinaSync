import { describe, expect, it } from 'vitest';
import { missingCarFields, missingClientFields, nextHint } from '../../frontend/oficinasync-web/src/lib/wizardMissing';

describe('o que falta pra continuar (botão travado explica o porquê)', () => {
  it('cliente: lista só o que falta, em palavras simples', () => {
    expect(missingClientFields({ name: 'Ana', phone: '+5514997001122', cpf: '52998224725', email: '', address: '' })).toEqual(['endereço']);
    expect(missingClientFields({ name: '', phone: '', cpf: '111', email: 'x@', address: 'Rua A' })).toEqual([
      'nome',
      'telefone',
      'CPF válido',
      'e-mail válido',
    ]);
  });

  it('veículo: chassi curto e ano inválido aparecem', () => {
    expect(
      missingCarFields({ plate: 'ABC1D23', brand: 'Fiat', model: 'Uno', year: '1800', color: 'Branco', chassis: 'AB', mileageIn: '100' }),
    ).toEqual(['ano', 'chassi (5 ou mais letras/números)']);
  });

  it('frase do aviso', () => {
    expect(nextHint(['endereço', 'chassi'])).toBe('Falta: endereço, chassi');
    expect(nextHint([])).toBeUndefined();
  });
});
