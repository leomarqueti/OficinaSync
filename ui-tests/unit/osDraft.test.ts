import { describe, expect, it } from 'vitest';
import {
  DRAFT_KEY,
  DRAFT_MAX_AGE_MS,
  clearOsDraft,
  hasDraftContent,
  loadOsDraft,
  loadGuidedDraft,
  saveGuidedDraft,
  saveOsDraft,
  type OsDraft,
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

const draft: OsDraft = {
  step: 1,
  quickMode: false,
  fields: { name: 'Marcos', phone: '+5514997001122', plate: 'ABC1D23', complaint: 'barulho' },
  answers: { uso: 'cidade' },
  selectedClientId: null,
  selectedCarId: null,
};

describe('rascunho da abertura de OS (interrupção no balcão não apaga nada)', () => {
  it('salva e recupera o que foi digitado', () => {
    const s = fakeStorage();
    saveOsDraft(s, draft, 1000);
    expect(loadOsDraft(s, 2000)).toEqual(draft);
  });

  it('rascunho velho (mais de 1 dia) é descartado', () => {
    const s = fakeStorage();
    saveOsDraft(s, draft, 0);
    expect(loadOsDraft(s, DRAFT_MAX_AGE_MS + 1)).toBeNull();
  });

  it('lixo ou storage bloqueado não quebra a tela', () => {
    const s = fakeStorage();
    s.setItem(DRAFT_KEY, '{quebrado');
    expect(loadOsDraft(s, 0)).toBeNull();
    const broken = {
      getItem: () => {
        throw new Error('x');
      },
      setItem: () => {
        throw new Error('x');
      },
      removeItem: () => {
        throw new Error('x');
      },
    };
    expect(loadOsDraft(broken, 0)).toBeNull();
    expect(() => saveOsDraft(broken, draft, 0)).not.toThrow();
    expect(() => clearOsDraft(broken)).not.toThrow();
  });

  it('limpar apaga; formulário vazio não conta como rascunho', () => {
    const s = fakeStorage();
    saveOsDraft(s, draft, 0);
    clearOsDraft(s);
    expect(loadOsDraft(s, 0)).toBeNull();
    expect(hasDraftContent({ ...draft, fields: { name: '', plate: '  ' }, answers: {} })).toBe(false);
    expect(hasDraftContent(draft)).toBe(true);
  });
});

describe('rascunho da abertura guiada (formato novo)', () => {
  it('guarda as respostas e a tela onde parou', () => {
    const s = fakeStorage();
    const state = { ...emptyGuidedState(), plate: 'ABC1D23', brand: 'Fiat', model: 'Uno' };
    saveGuidedDraft(s, { state, step: 'km' }, 1000);
    expect(loadGuidedDraft(s, 2000)).toEqual({ state, step: 'km' });
  });

  it('rascunho do formato antigo é ignorado (não quebra a tela)', () => {
    const s = fakeStorage();
    saveOsDraft(s, draft, 1000);
    expect(loadGuidedDraft(s, 2000)).toBeNull();
  });

  it('rascunho novo vencido é ignorado', () => {
    const s = fakeStorage();
    saveGuidedDraft(s, { state: emptyGuidedState(), step: 'plate' }, 0);
    expect(loadGuidedDraft(s, DRAFT_MAX_AGE_MS + 1)).toBeNull();
  });
});
