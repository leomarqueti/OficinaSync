import { describe, expect, it } from 'vitest';
import { CAR_BRANDS } from '../../frontend/oficinasync-web/src/lib/carBrands';
import { COMMON_COLORS, FUEL_OPTIONS, MODELS_BY_BRAND, modelsFor, yearOptions } from '../../frontend/oficinasync-web/src/lib/carCatalog';

describe('catálogo da abertura guiada', () => {
  it('toda marca da lista tem ao menos 3 modelos, sem repetir', () => {
    for (const brand of CAR_BRANDS) {
      const models = MODELS_BY_BRAND[brand];
      expect(models, brand).toBeDefined();
      expect(models.length, brand).toBeGreaterThanOrEqual(3);
      expect(new Set(models).size, brand).toBe(models.length);
    }
  });

  it('modelos são só os da marca escolhida', () => {
    expect(modelsFor('Volkswagen')).toContain('Gol');
    expect(modelsFor('Volkswagen')).not.toContain('Uno');
    expect(modelsFor('Xpto')).toEqual([]);
  });

  it('anos: do ano que vem até 1980, do mais novo pro mais velho', () => {
    const years = yearOptions(new Date('2026-06-01'));
    expect(years[0]).toBe(2027);
    expect(years[years.length - 1]).toBe(1980);
  });

  it('combustível usa exatamente os valores que o backend aceita', () => {
    expect(FUEL_OPTIONS.map((f) => f.value)).toEqual(['flex', 'gasolina', 'diesel', 'eletrico']);
  });

  it('cores comuns têm nome e cor', () => {
    expect(COMMON_COLORS.length).toBeGreaterThanOrEqual(8);
    expect(COMMON_COLORS.map((c) => c.name)).toContain('Prata');
  });
});
