import { describe, expect, it } from 'vitest';
import {
  applyMatch,
  buildCarPayload,
  buildOrderPayload,
  emptyGuidedState,
  missingFor,
  resolvePlateMatch,
  stepsFor,
  type GuidedState,
  type PlateMatch,
} from '../../frontend/oficinasync-web/src/lib/guidedOpen';

const ALL = ['plate', 'brand', 'model', 'year', 'km', 'extras', 'defect', 'client', 'photos', 'review'];

const fullMatch: PlateMatch = {
  car_id: 7,
  plate: 'ABC1D23',
  brand: 'Volkswagen',
  model: 'Gol',
  year: 2013,
  fuel_type: 'flex',
  color: 'Prata',
  chassis: '9BWZZZ377VT004251',
  last_mileage: 55500,
  owner: { client_id: 3, name: 'Seu João' },
};

const withMatch = (m: PlateMatch): GuidedState => applyMatch({ ...emptyGuidedState(), plate: m.plate }, m);

describe('placa reconhecida', () => {
  it('0, 1 ou vários carros com a placa', () => {
    expect(resolvePlateMatch([])).toEqual({ kind: 'none' });
    expect(resolvePlateMatch([fullMatch])).toEqual({ kind: 'one', match: fullMatch });
    expect(resolvePlateMatch([fullMatch, { ...fullMatch, car_id: 8 }])).toMatchObject({ kind: 'many' });
  });

  it('aplicar o carro preenche tudo, inclusive o último KM e o dono', () => {
    const s = withMatch(fullMatch);
    expect(s).toMatchObject({ brand: 'Volkswagen', model: 'Gol', year: '2013', fuel: 'flex', color: 'Prata', km: '55500' });
    expect(s.client.client_id).toBe(3);
    expect(s.client.name).toBe('Seu João');
  });
});

describe('quais telas aparecem', () => {
  it('carro novo: as 10 telas', () => {
    expect(stepsFor(emptyGuidedState())).toEqual(ALL);
  });

  it('carro conhecido e completo: pula marca, modelo, ano e opcionais (mas pergunta o KM de hoje)', () => {
    expect(stepsFor(withMatch(fullMatch))).toEqual(['plate', 'km', 'defect', 'client', 'photos', 'review']);
  });

  it('carro conhecido sem modelo (aberto no modo rápido): pergunta só o que falta', () => {
    const steps = stepsFor(withMatch({ ...fullMatch, model: null }));
    expect(steps).toContain('model');
    expect(steps).not.toContain('brand');
  });

  it('carro conhecido sem cor: mostra os opcionais', () => {
    expect(stepsFor(withMatch({ ...fullMatch, color: null }))).toContain('extras');
  });

  it('"não é esse carro": abre marca até opcionais pra corrigir', () => {
    expect(stepsFor({ ...withMatch(fullMatch), correcting: true })).toEqual(ALL);
  });
});

describe('o que falta pra continuar', () => {
  const s = emptyGuidedState();
  it('defeito curto', () => {
    expect(missingFor('defect', { ...s, defect: 'abc' })).toEqual(['descrever o defeito (5 letras ou mais)']);
    expect(missingFor('defect', { ...s, defect: 'falha ao ligar' })).toEqual([]);
  });

  it('fotos: diz qual lado falta', () => {
    expect(missingFor('photos', { ...s, photos: { front: true, rear: true, left: true, right: false } })).toEqual(['foto do lado direito']);
  });

  it('cliente: precisa dizer se está aqui; se está, nome e telefone', () => {
    expect(missingFor('client', { ...s, clientPresent: null })).toEqual(['dizer se o cliente está aqui']);
    expect(missingFor('client', { ...s, clientPresent: true })).toEqual(['nome', 'telefone']);
    expect(missingFor('client', { ...s, clientPresent: false })).toEqual([]);
    expect(missingFor('client', { ...s, clientPresent: true, client: { ...s.client, client_id: 9 } })).toEqual([]);
  });

  it('opcionais nunca travam; placa inválida trava', () => {
    expect(missingFor('extras', s)).toEqual([]);
    expect(missingFor('plate', { ...s, plate: 'AB1' })).toEqual(['placa válida']);
  });
});

describe('o que é enviado ao abrir', () => {
  it('carro novo: cria com placa normalizada e ano em número, só o que foi preenchido', () => {
    const p = buildCarPayload({ ...emptyGuidedState(), plate: 'abc-1d23', brand: 'Fiat', model: 'Uno', year: '2008', km: '120000' });
    expect(p).toEqual({ create: { plate: 'ABC1D23', brand: 'Fiat', model: 'Uno', year: 2008, mileage_in: 120000 } });
  });

  it('carro conhecido sem mudança: nada a enviar', () => {
    expect(buildCarPayload(withMatch(fullMatch))).toBeNull();
  });

  it('carro conhecido com cor nova: corrige só a cor', () => {
    expect(buildCarPayload({ ...withMatch(fullMatch), color: 'Preto' })).toEqual({ patch: { car_id: 7, body: { color: 'Preto' } } });
  });

  it('OS: KM em número; cliente ausente usa o dono; sem dono não manda client_id', () => {
    const base = { ...withMatch(fullMatch), defect: 'Barulho na suspensão', km: '56000', clientPresent: false };
    expect(buildOrderPayload(base, 7, null)).toEqual({ car_id: 7, client_id: 3, client_complaint: 'Barulho na suspensão', mileage_in: 56000 });
    const semDono = { ...emptyGuidedState(), defect: 'Barulho na suspensão', km: '1000', clientPresent: false };
    expect(buildOrderPayload(semDono, 9, null)).toEqual({ car_id: 9, client_complaint: 'Barulho na suspensão', mileage_in: 1000 });
    expect(buildOrderPayload({ ...semDono, clientPresent: true }, 9, 12)).toMatchObject({ client_id: 12 });
  });
});

describe('trocar a placa depois de um carro reconhecido', () => {
  it('limpa o dono que veio do carro antigo (não vira dono do carro novo)', async () => {
    const { editPlate } = await import('../../frontend/oficinasync-web/src/lib/guidedOpen');
    const s = { ...withMatch(fullMatch), clientPresent: true };
    const edited = editPlate(s, 'XYZ9A88');
    expect(edited.match).toBeNull();
    expect(edited.client.client_id).toBeNull();
    expect(edited.clientPresent).toBeNull();
    expect(edited.plate).toBe('XYZ9A88');
  });

  it('cliente escolhido à mão (não o dono do carro) é mantido', async () => {
    const { editPlate } = await import('../../frontend/oficinasync-web/src/lib/guidedOpen');
    const s = { ...withMatch(fullMatch), client: { ...emptyGuidedState().client, client_id: 99, name: 'Outro' } };
    expect(editPlate(s, 'XYZ9A88').client.client_id).toBe(99);
  });
});
