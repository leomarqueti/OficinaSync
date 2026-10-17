import { describe, expect, it } from 'vitest';
import {
  modeFor,
  modeKey,
  readModePreference,
  saveModePreference,
} from '../../frontend/oficinasync-web/src/lib/mode';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}
const broken = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('bloqueado');
  },
};

describe('qual cara do sistema cada um vê', () => {
  it('mecânico sempre no modo simples, mesmo com preferência salva', () => {
    expect(modeFor('mechanic', null)).toBe('simple');
    expect(modeFor('mechanic', 'control')).toBe('simple');
  });

  it('recepção sempre no modo controle', () => {
    expect(modeFor('receptionist', null)).toBe('control');
    expect(modeFor('receptionist', 'simple')).toBe('control');
  });

  it('dono: controle por padrão, simples quando escolhe', () => {
    expect(modeFor('owner', null)).toBe('control');
    expect(modeFor('owner', 'simple')).toBe('simple');
  });
});

describe('preferência do dono guardada por usuário', () => {
  it('salva e lê de volta, separado por usuário', () => {
    const s = fakeStorage();
    saveModePreference(s, 7, 'simple');
    expect(readModePreference(s, 7)).toBe('simple');
    expect(readModePreference(s, 8)).toBeNull();
    expect(modeKey(7)).toBe('oficinasync_mode_7');
  });

  it('valor estranho no storage é ignorado', () => {
    const s = fakeStorage();
    s.setItem(modeKey(7), 'qualquer');
    expect(readModePreference(s, 7)).toBeNull();
  });

  it('storage que lança erro (aba anônima) não quebra: lê null, salvar não explode', () => {
    expect(readModePreference(broken, 7)).toBeNull();
    expect(() => saveModePreference(broken, 7, 'simple')).not.toThrow();
    expect(readModePreference(undefined, 7)).toBeNull();
  });
});
