import { buildReportHtml, type ReportData } from './report.template';

const baseData: ReportData = {
  tenantName: 'Oficina Teste',
  tenantCnpj: '11222333000181',
  car: {
    brand: null,
    model: null,
    year: null,
    plate: 'ABC1D23',
    color: null,
    fuel_type: null,
    mileage_in: null,
  },
  clientName: null,
  clientComplaint: 'Não pega de manhã',
  intakePhotos: [],
  createdAt: new Date('2026-10-15T12:00:00Z'),
  finishedAt: null,
  chapters: [],
  photoLookup: new Map(),
  rootCause: null,
  conclusion: null,
  finalVerdict: null,
  responsavelTecnico: null,
  publicUrl: 'http://localhost/servico/x',
  qrCodeDataUri: 'data:image/png;base64,AAAA',
};

describe('laudo com carro/cliente parciais', () => {
  it('não escreve "null" nem "undefined" e mostra a placa', () => {
    const html = buildReportHtml(baseData);

    expect(html).toContain('ABC1D23');
    expect(html).not.toMatch(/\bnull\b/);
    expect(html).not.toMatch(/\bundefined\b/);
  });

  it('veículo sem marca/modelo aparece como traço', () => {
    const html = buildReportHtml(baseData);
    expect(html).toMatch(/Veículo<\/div><div class="field-value">-<\/div>/);
  });
});
