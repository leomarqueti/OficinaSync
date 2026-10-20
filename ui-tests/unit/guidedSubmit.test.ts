import { describe, expect, it } from 'vitest';
import { emptyGuidedState, type GuidedState } from '../../frontend/oficinasync-web/src/lib/guidedOpen';
import { emptySubmitProgress, submitGuidedOpen, type SubmitDeps } from '../../frontend/oficinasync-web/src/lib/guidedSubmit';

const png = (name: string) => new File([new Uint8Array([1])], name, { type: 'image/png' });

function fakeDeps(opts: { failUploadOnce?: string } = {}) {
  const calls: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  let failed = false;
  let nextId = 100;
  const deps: SubmitDeps = {
    json: async (method, path) => {
      calls.push(`${method} ${path}`);
      if (path === '/cars') return { car_id: 7 };
      if (path === '/service_orders') return { service_order_id: 55 };
      if (path === '/sections') return { section_id: nextId++ };
      return {};
    },
    upload: async (_file, label) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 2));
      inFlight--;
      if (opts.failUploadOnce === label && !failed) {
        failed = true;
        throw new Error('caiu o 4G');
      }
      calls.push(`UPLOAD ${label}`);
    },
  };
  return { deps, calls, max: () => maxInFlight };
}

const ready = (): GuidedState => ({
  ...emptyGuidedState(),
  plate: 'ABC1D23',
  brand: 'Fiat',
  model: 'Uno',
  year: '2008',
  km: '1000',
  defect: 'Barulho no motor',
  clientPresent: false,
  photos: { front: true, rear: true, left: true, right: true },
});
const files = () => ({
  photos: { front: png('f'), rear: png('r'), left: png('l'), right: png('d') },
  extraPhotos: [png('x1'), png('x2')],
  audio: png('a'),
  video: null,
});

describe('envio da abertura guiada', () => {
  it('fotos vão uma de cada vez (servidor aceita só 4 envios simultâneos no total)', async () => {
    const f = fakeDeps();
    await submitGuidedOpen(ready(), files(), emptySubmitProgress(), f.deps);
    expect(f.max()).toBe(1);
  });

  it('falhou uma foto no meio: tentar de novo não recria etapa nem reenvia o que já subiu', async () => {
    const f = fakeDeps({ failUploadOnce: 'Lado esquerdo do veículo' });
    const progress = emptySubmitProgress();
    await expect(submitGuidedOpen(ready(), files(), progress, f.deps)).rejects.toThrow('caiu o 4G');
    const result = await submitGuidedOpen(ready(), files(), progress, f.deps);

    expect(result.orderId).toBe(55);
    expect(f.calls.filter((c) => c === 'POST /cars')).toHaveLength(1);
    expect(f.calls.filter((c) => c === 'POST /service_orders')).toHaveLength(1);
    expect(f.calls.filter((c) => c === 'POST /sections')).toHaveLength(2); // intake + checkin, uma vez cada
    expect(f.calls.filter((c) => c === 'UPLOAD Frente do veículo')).toHaveLength(1);
    expect(f.calls.filter((c) => c === 'UPLOAD Lado esquerdo do veículo')).toHaveLength(1);
    expect(f.calls.filter((c) => c === 'UPLOAD Áudio do defeito')).toHaveLength(1);
  });
});
