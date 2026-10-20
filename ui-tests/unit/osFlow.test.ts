import { describe, expect, it } from 'vitest';
import {
  appendNotes,
  checkinPhotos,
  currentStep,
  listedSections,
  mainSteps,
  publishBlocker,
  sectionSummary,
} from '../../frontend/oficinasync-web/src/lib/osFlow';
import type { MediaItem, SectionItem, TestItem } from '../../frontend/oficinasync-web/src/components/os/types';

let nextId = 1;
const media = (type: string, label: string | null = null): MediaItem => ({
  media_id: nextId++,
  type,
  bucket: 'b',
  object_name: 'o',
  mime_type: type === 'photo' ? 'image/jpeg' : 'x',
  size: 1,
  label,
  created_at: '2026-10-20T10:00:00Z',
  url: 'http://x/y',
});
const test = (test_type: TestItem['test_type'] = null): TestItem => ({
  test_id: nextId++,
  title: 't',
  measurements: null,
  test_type,
  data: null,
  verdict: null,
  notes: null,
  created_at: '2026-10-20T10:00:00Z',
});
const section = (type: string, status: 'draft' | 'published', extra: Partial<SectionItem> = {}): SectionItem => ({
  section_id: nextId++,
  type,
  status,
  notes: null,
  published_at: status === 'published' ? '2026-10-20T10:00:00Z' : null,
  created_at: '2026-10-20T10:00:00Z',
  medias: [],
  tests: [],
  ...extra,
});

describe('etapas principais da OS', () => {
  it('OS recém-aberta (check-in publicado): a etapa da vez é o Diagnóstico', () => {
    const sections = [section('intake', 'published'), section('checkin', 'published')];
    expect(currentStep(sections)).toBe('diagnosis');
    expect(mainSteps(sections).map((s) => [s.type, s.state])).toEqual([
      ['checkin', 'done'],
      ['diagnosis', 'current'],
      ['repair', 'todo'],
      ['final', 'todo'],
    ]);
  });

  it('etapa criada mas ainda não mostrada ao cliente continua sendo a da vez', () => {
    const diag = section('diagnosis', 'draft');
    const steps = mainSteps([section('checkin', 'published'), diag]);
    expect(steps[1]).toMatchObject({ type: 'diagnosis', state: 'current', section: diag });
  });

  it('OS sem check-in (abertura antiga sem foto): começa pelo Check-in', () => {
    expect(currentStep([])).toBe('checkin');
  });

  it('pulou uma etapa (reparo publicado sem diagnóstico): a da vez é a primeira que falta', () => {
    const sections = [section('checkin', 'published'), section('repair', 'published')];
    expect(currentStep(sections)).toBe('diagnosis');
    expect(mainSteps(sections)[2].state).toBe('done');
  });

  it('as 4 mostradas ao cliente: nenhuma etapa da vez (tudo pronto)', () => {
    const sections = ['checkin', 'diagnosis', 'repair', 'final'].map((t) => section(t, 'published'));
    expect(currentStep(sections)).toBeNull();
    expect(mainSteps(sections).every((s) => s.state === 'done')).toBe(true);
  });
});

describe('lista embaixo do cartão "Agora"', () => {
  it('mostra toda etapa que existe, menos a da vez — rascunho fora de ordem não some', () => {
    // OS antiga sem check-in: a da vez é o Check-in, mas o Diagnóstico já foi criado
    const diag = section('diagnosis', 'draft', { notes: 'Medi a bateria' });
    const extra = section('preventive', 'draft');
    const listed = listedSections([section('intake', 'published'), extra, diag]);
    expect(listed.map((s) => s.type)).toEqual(['diagnosis', 'preventive']);
  });

  it('a etapa da vez não se repete na lista; as feitas aparecem na ordem do ciclo', () => {
    const sections = [section('repair', 'draft'), section('diagnosis', 'published'), section('checkin', 'published')];
    expect(listedSections(sections).map((s) => s.type)).toEqual(['checkin', 'diagnosis']);
  });
});

describe('resumo da etapa', () => {
  it('conta o que foi registrado, no singular e no plural', () => {
    const s = section('diagnosis', 'draft', {
      notes: 'Medi a bateria',
      medias: [media('photo'), media('photo'), media('video'), media('audio')],
      tests: [test('bateria'), test('achado_adicional'), test('achado_adicional')],
    });
    expect(sectionSummary(s)).toBe('explicação · 2 fotos · 1 vídeo · 1 áudio · 1 teste · 2 achados');
  });

  it('etapa vazia ou que ainda não existe', () => {
    expect(sectionSummary(null)).toBe('Nada registrado ainda');
    expect(sectionSummary(section('repair', 'draft', { notes: '   ' }))).toBe('Nada registrado ainda');
  });
});

describe('mostrar ao cliente', () => {
  it('etapa vazia (ou inexistente) não publica e diz o que fazer', () => {
    const msg = 'Fale, tire uma foto ou faça um teste antes de mostrar ao cliente.';
    expect(publishBlocker(null)).toBe(msg);
    expect(publishBlocker(section('repair', 'draft'))).toBe(msg);
  });

  it('com qualquer registro, pode publicar', () => {
    expect(publishBlocker(section('repair', 'draft', { notes: 'Troquei a vela' }))).toBeNull();
    expect(publishBlocker(section('repair', 'draft', { medias: [media('photo')] }))).toBeNull();
    expect(publishBlocker(section('repair', 'draft', { tests: [test()] }))).toBeNull();
  });
});

describe('texto falado soma na explicação', () => {
  it('nunca apaga o que já tinha', () => {
    expect(appendNotes(null, ' bateria fraca ')).toBe('bateria fraca');
    expect(appendNotes('Medi a bateria', 'deu 11,2V')).toBe('Medi a bateria\ndeu 11,2V');
    expect(appendNotes('Medi a bateria', '   ')).toBe('Medi a bateria');
  });
});

describe('como o carro chegou', () => {
  it('fotos do check-in, as 4 guiadas primeiro', () => {
    const extra = media('photo', 'Detalhe adicional 1');
    const front = media('photo', 'Frente do veículo');
    const checkin = section('checkin', 'published', { medias: [extra, media('video'), front] });
    expect(checkinPhotos([checkin]).map((m) => m.label)).toEqual(['Frente do veículo', 'Detalhe adicional 1']);
    expect(checkinPhotos([])).toEqual([]);
  });
});
