import { describe, expect, it } from 'vitest';
import {
  TOUR_VERSION,
  markTourDone,
  resetTour,
  shouldShowTour,
  tourKey,
  tourSteps,
} from '../../frontend/oficinasync-web/src/lib/tours';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('estado do passo a passo', () => {
  it('aparece no primeiro acesso, some depois de concluído, volta ao resetar', () => {
    const s = fakeStorage();
    expect(shouldShowTour(s, 7)).toBe(true);
    markTourDone(s, 7);
    expect(shouldShowTour(s, 7)).toBe(false);
    resetTour(s, 7);
    expect(shouldShowTour(s, 7)).toBe(true);
  });

  it('é por usuário (outro funcionário no mesmo aparelho vê o dele)', () => {
    const s = fakeStorage();
    markTourDone(s, 1);
    expect(shouldShowTour(s, 2)).toBe(true);
  });

  it('muda de versão → todo mundo vê de novo', () => {
    const s = fakeStorage();
    s.setItem(tourKey(5).replace(`v${TOUR_VERSION}`, `v${TOUR_VERSION - 1}`), '1');
    expect(shouldShowTour(s, 5)).toBe(true);
  });

  it('tem roteiro curto (4–6 passos) para cada perfil, em português', () => {
    for (const role of ['owner', 'mechanic', 'receptionist'] as const) {
      const steps = tourSteps(role);
      expect(steps.length).toBeGreaterThanOrEqual(4);
      expect(steps.length).toBeLessThanOrEqual(6);
      for (const step of steps) {
        expect(step.title.length).toBeGreaterThan(3);
        expect(step.text.length).toBeGreaterThan(10);
      }
    }
  });

  it('mecânico aprende peças e equipe; dono aprende ficha e comissões; recepção, completar dados', () => {
    expect(tourSteps('mechanic').map((s) => s.text).join(' ')).toMatch(/quem ajudou/i);
    expect(tourSteps('owner').map((s) => s.text).join(' ')).toMatch(/ficha/i);
    expect(tourSteps('owner').map((s) => s.text).join(' ')).toMatch(/comiss/i);
    expect(tourSteps('receptionist').map((s) => s.text).join(' ')).toMatch(/completar/i);
  });
});
