import { describe, expect, it } from 'vitest';
import {
  DRAFT_KEY,
  DRAFT_MAX_AGE_MS,
  clearOsDraft,
  loadGuidedDraft,
  saveGuidedDraft,
} from '../../frontend/oficinasync-web/src/lib/osDraft';
import { emptyGuidedState } from '../../frontend/oficinasync-web/src/lib/guidedOpen';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}


describe('rascunho da abertura guiada (formato novo)', () => {
  it('guarda as respostas e a tela onde parou', () => {
    const s = fakeStorage();
    const state = { ...emptyGuidedState(), plate: 'ABC1D23', brand: 'Fiat', model: 'Uno' };
    saveGuidedDraft(s, { state, step: 'km' }, 1000);
    expect(loadGuidedDraft(s, 2000)).toEqual({ state, step: 'km' });
  });

  it('rascunho do formato antigo é ignorado (não quebra a tela)', () => {
    const s = fakeStorage();
    // formato do wizard antigo: { savedAt, draft } sem versão
    s.setItem(DRAFT_KEY, JSON.stringify({ savedAt: 1000, draft: { step: 1, fields: { name: 'X' } } }));
    expect(loadGuidedDraft(s, 2000)).toBeNull();
  });

  it('rascunho novo vencido é ignorado', () => {
    const s = fakeStorage();
    saveGuidedDraft(s, { state: emptyGuidedState(), step: 'plate' }, 0);
    expect(loadGuidedDraft(s, DRAFT_MAX_AGE_MS + 1)).toBeNull();
  });
});

describe('rascunho: limpeza e storage bloqueado', () => {
  it('limpar apaga; lixo ou storage bloqueado não quebra', () => {
    const s = fakeStorage();
    saveGuidedDraft(s, { state: emptyGuidedState(), step: 'km' }, 0);
    clearOsDraft(s);
    expect(loadGuidedDraft(s, 0)).toBeNull();
    s.setItem(DRAFT_KEY, '{quebrado');
    expect(loadGuidedDraft(s, 0)).toBeNull();
    const broken = {
      getItem: () => { throw new Error('x'); },
      setItem: () => { throw new Error('x'); },
      removeItem: () => { throw new Error('x'); },
    };
    expect(loadGuidedDraft(broken, 0)).toBeNull();
    expect(() => saveGuidedDraft(broken, { state: emptyGuidedState(), step: 'plate' }, 0)).not.toThrow();
    expect(() => clearOsDraft(broken)).not.toThrow();
  });
});
