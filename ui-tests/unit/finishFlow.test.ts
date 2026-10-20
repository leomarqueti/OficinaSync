import { describe, expect, it } from 'vitest';
import {
  emptyFinishState,
  finishMissing,
  loadFinishDraft,
  saveFinishDraft,
  submitFinish,
  type FinishProgress,
  type FinishState,
} from '../../frontend/oficinasync-web/src/lib/finishFlow';

const allPhotos = { front: true, rear: true, left: true, right: true };

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

describe('o que falta em cada tela da finalização', () => {
  it('veredito é obrigatório (um toque)', () => {
    expect(finishMissing('verdict', emptyFinishState())).toEqual(['como terminou']);
    expect(finishMissing('verdict', { ...emptyFinishState(), verdict: 'resolved' })).toEqual([]);
  });

  it('causa e "como saiu" podem ficar em branco', () => {
    expect(finishMissing('cause', emptyFinishState())).toEqual([]);
    expect(finishMissing('conclusion', emptyFinishState())).toEqual([]);
  });

  it('as 4 fotos de saída são obrigatórias e diz qual falta', () => {
    const s = { ...emptyFinishState(), photos: { ...allPhotos, left: false } };
    expect(finishMissing('photos', s)).toEqual(['foto do lado esquerdo']);
    expect(finishMissing('photos', { ...emptyFinishState(), photos: allPhotos })).toEqual([]);
  });
});

describe('rascunho da finalização (texto não se perde)', () => {
  it('guarda e devolve o que foi escrito e a tela, por OS', () => {
    const storage = memoryStorage();
    const state: FinishState = { ...emptyFinishState(), verdict: 'partial', rootCause: 'bico sujo', conclusion: 'motor ok', photos: { ...allPhotos, rear: false } };
    saveFinishDraft(storage, 42, { state, step: 'conclusion' });
    const draft = loadFinishDraft(storage, 42);
    expect(draft?.step).toBe('conclusion');
    expect(draft?.state).toMatchObject({ verdict: 'partial', rootCause: 'bico sujo', conclusion: 'motor ok' });
    expect(loadFinishDraft(storage, 43)).toBeNull();
  });

  it('rascunho velho (mais de 7 dias) é ignorado', () => {
    const storage = memoryStorage();
    const old = Date.now() - 8 * 24 * 3600 * 1000;
    saveFinishDraft(storage, 42, { state: emptyFinishState(), step: 'cause' }, old);
    expect(loadFinishDraft(storage, 42)).toBeNull();
  });

  it('rascunho corrompido não quebra a tela', () => {
    const storage = memoryStorage();
    storage.setItem('oficinasync_finish_draft_42', '{quebrado');
    expect(loadFinishDraft(storage, 42)).toBeNull();
  });
});

describe('envio da finalização', () => {
  const photo = (n: string) => new File(['x'], `${n}.jpg`, { type: 'image/jpeg' });
  const files = { photos: { front: photo('f'), rear: photo('r'), left: photo('l'), right: photo('d') }, extraPhotos: [photo('e')] };
  const state: FinishState = { verdict: 'resolved', rootCause: ' vela gasta ', conclusion: ' motor redondo ', photos: allPhotos, extraPhotos: 1 };

  function fakeDeps(failOn?: string) {
    const calls: string[] = [];
    let failed = false;
    return {
      calls,
      deps: {
        json: async (method: string, path: string, body?: unknown) => {
          calls.push(`${method} ${path} ${body ? JSON.stringify(body) : ''}`.trim());
          if (path === '/sections') return { section_id: 9 };
          return {};
        },
        upload: async (_file: File, label: string, sectionId: number) => {
          if (label === failOn && !failed) {
            failed = true;
            throw new Error('caiu a internet');
          }
          calls.push(`UPLOAD ${sectionId} ${label}`);
        },
      },
    };
  }

  it('sem etapa final: cria com o texto de como saiu, sobe as fotos em fila, publica e finaliza', async () => {
    const { calls, deps } = fakeDeps();
    const progress: FinishProgress = { uploaded: [] };
    await submitFinish(42, null, state, files, progress, deps);
    expect(calls).toEqual([
      'POST /sections {"service_order_id":42,"type":"final","notes":"motor redondo"}',
      'UPLOAD 9 Frente na saída',
      'UPLOAD 9 Traseira na saída',
      'UPLOAD 9 Lado esquerdo na saída',
      'UPLOAD 9 Lado direito na saída',
      'UPLOAD 9 Detalhe na saída 1',
      'PATCH /sections/9/publish',
      'PATCH /service_orders/42/finish {"root_cause":"vela gasta","conclusion":"motor redondo","final_verdict":"resolved"}',
    ]);
  });

  it('etapa final já publicada: só sobe as fotos nela e finaliza', async () => {
    const { calls, deps } = fakeDeps();
    await submitFinish(42, { section_id: 5, status: 'published' }, state, files, { uploaded: [] }, deps);
    expect(calls.filter((c) => c.startsWith('POST') || c.includes('publish'))).toEqual([]);
    expect(calls[0]).toBe('UPLOAD 5 Frente na saída');
    expect(calls.at(-1)).toMatch(/^PATCH \/service_orders\/42\/finish/);
  });

  it('caiu no meio: tocar de novo continua de onde parou, sem foto repetida', async () => {
    const { calls, deps } = fakeDeps('Lado esquerdo na saída');
    const progress: FinishProgress = { uploaded: [] };
    await expect(submitFinish(42, null, state, files, progress, deps)).rejects.toThrow('caiu a internet');
    await submitFinish(42, null, state, files, progress, deps);
    expect(calls.filter((c) => c.startsWith('POST /sections'))).toHaveLength(1);
    expect(calls.filter((c) => c === 'UPLOAD 9 Frente na saída')).toHaveLength(1);
    expect(calls.filter((c) => c === 'UPLOAD 9 Lado esquerdo na saída')).toHaveLength(1);
    expect(calls.filter((c) => c.includes('/finish'))).toHaveLength(1);
  });

  it('textos em branco não vão (o backend guarda null, não string vazia)', async () => {
    const { calls, deps } = fakeDeps();
    await submitFinish(42, { section_id: 5, status: 'published' }, { ...state, rootCause: '  ', conclusion: '' }, files, { uploaded: [] }, deps);
    expect(calls.at(-1)).toBe('PATCH /service_orders/42/finish {"final_verdict":"resolved"}');
  });
});
