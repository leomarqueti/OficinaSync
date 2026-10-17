import {
  buildFooterTemplate,
  buildHeaderTemplate,
  buildReportHtml,
  type ReportData,
  type ReportProcedureStep,
} from './report.template';

// Qualquer texto digitado pela oficina entra no HTML que o Chromium renderiza no servidor.
// Sem escape, um "<img src=x onerror=...>" na descrição de uma peça/etapa vira código rodando
// dentro do Puppeteer (leitura de rede interna, SSRF) e dentro do PDF.
const X = '"><img src=x onerror=1><script>1</script>';

const step = (over: Partial<ReportProcedureStep>): ReportProcedureStep => ({
  title: X,
  measurements: [{ label: X, expected: X, actual: X }],
  test_type: null,
  data: null,
  verdict: 'approved',
  notes: X,
  ...over,
});

const hostile = (): ReportData => ({
  tenantName: X,
  tenantCnpj: X,
  car: { brand: X, model: X, year: 2010, plate: X, color: X, fuel_type: X, mileage_in: 1 },
  clientName: X,
  clientComplaint: X,
  intakePhotos: [{ label: X, dataUri: 'data:image/png;base64,AAAA' }],
  createdAt: new Date('2026-10-10T12:00:00Z'),
  finishedAt: new Date('2026-10-11T12:00:00Z'),
  chapters: [
    {
      type: 'diagnosis',
      label: X,
      notes: X,
      photos: [{ label: X, dataUri: 'data:image/png;base64,AAAA' }],
      tests: [
        step({}),
        step({
          test_type: 'compressao_mecanica',
          data: { specMin: X, specMax: X, unit: X, tool: X, cylinders: [{ number: X, value: X, status: X }] },
        }),
        step({ test_type: 'leitura_dtc', data: { scanner: X, dtcs: [{ code: X, description: X, module: X, status: X }], systems_ok: [X] } }),
        step({ test_type: 'obd_snapshot', data: { device_name: X, collected_at: X, voltage: 12, params: { rpm: X }, dtcs: [{ code: X, description: X }] } }),
        step({ test_type: 'bateria', data: { tool: X, tension: X, cca: X, health: X } }),
        step({ test_type: 'injetores_banco', data: { tool: X, pulsos: X, specMin: X, specMax: X, unit: X, injectors: [{ number: X, value: X, sprayPattern: X }] } }),
        step({ test_type: 'antes_depois', data: { description: X } }),
        step({ test_type: 'achado_adicional', data: { description: X, severity: X } }),
      ],
    },
  ],
  photoLookup: new Map(),
  rootCause: X,
  conclusion: X,
  finalVerdict: 'resolved',
  responsavelTecnico: X,
  publicUrl: 'http://localhost/servico/x',
  qrCodeDataUri: 'data:image/png;base64,AAAA',
});

describe('laudo PDF: texto digitado pelo usuário é escapado', () => {
  const html = buildReportHtml(hostile());

  it('nenhuma tag injetada sobrevive no HTML', () => {
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>1</script>');
    expect(html).not.toContain('"><img');
  });

  it('o texto aparece escapado (o conteúdo não some do laudo)', () => {
    expect(html).toContain('&lt;img src=x onerror=1&gt;');
    expect(html).toContain('&quot;&gt;&lt;img');
  });

  it('cabeçalho e rodapé de página também escapam o nome da oficina', () => {
    expect(buildHeaderTemplate(X)).not.toContain('<img src=x');
    expect(buildFooterTemplate(X)).not.toContain('<img src=x');
  });

  it('o próprio laudo continua usando <img> para as fotos (só o texto do usuário foi escapado)', () => {
    expect(html).toContain('<img src="data:image/png;base64,AAAA"');
  });
});
