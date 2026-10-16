import { describe, expect, it } from 'vitest';
import {
  carDetails,
  carTitle,
  clientLabel,
  greeting,
  kmLabel,
} from '../../frontend/oficinasync-web/src/lib/display';

describe('textos reserva (OS aberta no modo rápido)', () => {
  it('cliente sem nome vira "Cliente não identificado"', () => {
    expect(clientLabel(null)).toBe('Cliente não identificado');
    expect(clientLabel(undefined)).toBe('Cliente não identificado');
    expect(clientLabel('   ')).toBe('Cliente não identificado');
    expect(clientLabel('Marcos')).toBe('Marcos');
  });

  it('veículo: junta marca e modelo; sem nenhum dos dois, texto reserva', () => {
    expect(carTitle({ brand: 'Fiat', model: 'Uno' })).toBe('Fiat Uno');
    expect(carTitle({ brand: null, model: 'Uno' })).toBe('Uno');
    expect(carTitle({ brand: null, model: null })).toBe('Veículo sem modelo informado');
  });

  it('detalhes do veículo ignoram o que não existe (sem "null" nem "undefined")', () => {
    expect(carDetails({ year: 2008, color: 'Branco', plate: 'ABC1D23' })).toBe(
      '2008 · Branco · ABC1D23',
    );
    expect(carDetails({ year: null, color: null, plate: 'ABC1D23' })).toBe('ABC1D23');
  });

  it('KM: formatado em pt-BR ou "KM não informado"', () => {
    expect(kmLabel(120000)).toBe(`${(120000).toLocaleString('pt-BR')} km`);
    expect(kmLabel(0)).toBe('0 km');
    expect(kmLabel(null)).toBe('KM não informado');
    expect(kmLabel(undefined)).toBe('KM não informado');
  });

  it('saudação da página do cliente: com nome vira "Olá, Fulano." e sem nome "Olá!"', () => {
    expect(greeting('maria da silva')).toBe('Olá, Maria.');
    expect(greeting(null)).toBe('Olá!');
    expect(greeting('  ')).toBe('Olá!');
  });
});
