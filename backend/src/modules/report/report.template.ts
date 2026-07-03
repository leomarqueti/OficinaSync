const verdictLabels: Record<string, string> = {
  approved: 'Aprovado',
  failed: 'Reprovado',
  inconclusive: 'Inconclusivo',
};

const finalVerdictBanner: Record<string, { text: string; color: string }> = {
  resolved: { text: 'FALHA SANADA — SERVIÇO CONCLUÍDO', color: '#059669' },
  not_resolved: {
    text: 'NÃO SANADO — REQUER NOVA AVALIAÇÃO',
    color: '#dc2626',
  },
  partial: { text: 'RESOLUÇÃO PARCIAL', color: '#d97706' },
};

const dtcStatusLabels: Record<string, string> = {
  confirmado: 'Confirmado',
  intermitente: 'Intermitente',
  passado: 'Passado',
  eliminado: 'Eliminado',
};

const sprayLabels: Record<string, string> = {
  OK: 'OK',
  IRREGULAR: 'Irregular',
  ENTUPIDO: 'Entupido',
  GOTEJANDO: 'Gotejando',
};

export interface ReportMeasurement {
  label: string;
  expected?: string;
  actual: string;
}

export interface ReportProcedureStep {
  title: string;
  measurements: ReportMeasurement[];
  test_type: string | null;
  data: Record<string, any> | null;
  verdict: string | null;
  notes: string | null;
}

export interface ReportPhoto {
  label: string;
  dataUri: string;
}

export interface ReportData {
  tenantName: string;
  tenantCnpj: string;
  car: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
    fuel_type: string;
    mileage_in: number;
  };
  clientComplaint: string | null;
  createdAt: Date;
  finishedAt: Date | null;
  procedureSteps: ReportProcedureStep[];
  photos: ReportPhoto[];
  photoLookup: Map<number, string>;
  rootCause: string | null;
  conclusion: string | null;
  finalVerdict: string | null;
}

function formatDate(value: Date | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function renderMeasurementsTable(measurements: ReportMeasurement[]) {
  if (!measurements || measurements.length === 0) return '';

  const rows = measurements
    .map(
      (m) => `
        <tr>
          <td>${m.label}</td>
          <td class="muted">${m.expected || '-'}</td>
          <td>${m.actual}</td>
        </tr>`,
    )
    .join('');

  return `
    <table class="measurements">
      <thead>
        <tr><th>Item</th><th>Esperado</th><th>Obtido</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderCompressaoBlock(
  data: Record<string, any>,
  photoLookup: Map<number, string>,
) {
  const specLine =
    data.specMin || data.specMax
      ? `<p class="muted">Especificado: ${data.specMin || '-'}–${data.specMax || '-'} ${data.unit ?? ''}${
          data.tool ? ` • Ferramenta: ${data.tool}` : ''
        }</p>`
      : '';

  const cylinders = (data.cylinders ?? [])
    .map((cyl: Record<string, any>) => {
      const photo = cyl.media_id ? photoLookup.get(cyl.media_id) : null;
      const badge = cyl.status
        ? `<span class="badge badge-${cyl.status}">${verdictLabels[cyl.status] ?? cyl.status}</span>`
        : '';

      return `
        <div class="cyl-item">
          ${photo ? `<img src="${photo}" />` : '<div class="cyl-photo-placeholder">Sem foto</div>'}
          <p class="cyl-number">Cil. ${cyl.number}</p>
          <p class="cyl-value">${cyl.value || '-'} ${data.unit ?? ''}</p>
          ${badge}
        </div>`;
    })
    .join('');

  return `${specLine}<div class="cyl-grid">${cylinders}</div>`;
}

function renderDtcBlock(data: Record<string, any>) {
  const scannerLine = data.scanner ? `<p class="muted">Scanner: ${data.scanner}</p>` : '';

  const rows = (data.dtcs ?? [])
    .map(
      (dtc: Record<string, any>) => `
      <tr>
        <td>${dtc.code}</td>
        <td>${dtc.description || '-'}</td>
        <td>${dtc.module || '-'}</td>
        <td><span class="badge badge-dtc-${dtc.status}">${dtcStatusLabels[dtc.status] ?? dtc.status}</span></td>
      </tr>`,
    )
    .join('');

  const table = rows
    ? `<table class="measurements"><thead><tr><th>Código</th><th>Descrição</th><th>Módulo</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`
    : '';

  const systems = String(data.systemsOk ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const systemsBlock = systems.length
    ? `<p class="systems-ok">Sistemas OK: ${systems.join(', ')}</p>`
    : '';

  return `${scannerLine}${table}${systemsBlock}`;
}

function renderBateriaBlock(data: Record<string, any>) {
  const toolLine = data.tool ? `<p class="muted">Ferramenta: ${data.tool}</p>` : '';

  const metrics: Array<[string, any, string]> = [
    ['Repouso', data.tensaoRepouso, 'V'],
    ['Mín. na partida', data.tensaoMinPartida, 'V'],
    ['Máx. em carga', data.tensaoMaxCarga, 'V'],
    ['Queda de tensão', data.quedaTensao, 'V'],
    ['Arrefecimento', data.tempArrefecimento, '°C'],
  ];

  const tiles = metrics
    .filter(([, value]) => value)
    .map(
      ([label, value, unit]) => `
      <div class="metric-tile">
        <p class="metric-value">${value}${unit}</p>
        <p class="metric-label">${label}</p>
      </div>`,
    )
    .join('');

  return `${toolLine}<div class="metric-grid">${tiles}</div>`;
}

function renderInjetoresBlock(
  data: Record<string, any>,
  photoLookup: Map<number, string>,
) {
  const infoParts = [
    data.tool && `Ferramenta: ${data.tool}`,
    data.pulsos && `${data.pulsos} pulsos`,
    (data.specMin || data.specMax) &&
      `Especificado: ${data.specMin || '-'}–${data.specMax || '-'} ${data.unit ?? ''}`,
  ].filter(Boolean);

  const infoLine = infoParts.length ? `<p class="muted">${infoParts.join(' • ')}</p>` : '';

  const antes = data.fotoAntesMediaId ? photoLookup.get(data.fotoAntesMediaId) : null;
  const depois = data.fotoDepoisMediaId ? photoLookup.get(data.fotoDepoisMediaId) : null;

  const photosBlock =
    antes || depois
      ? `<div class="photo-grid">
          ${antes ? `<div class="photo"><img src="${antes}" /><p class="photo-label">Antes</p></div>` : ''}
          ${depois ? `<div class="photo"><img src="${depois}" /><p class="photo-label">Depois</p></div>` : ''}
        </div>`
      : '';

  const rows = (data.injectors ?? [])
    .map(
      (inj: Record<string, any>) => `
      <tr>
        <td>${inj.number}</td>
        <td>${inj.value || '-'} ${data.unit ?? ''}</td>
        <td>${sprayLabels[inj.sprayPattern] ?? inj.sprayPattern}</td>
      </tr>`,
    )
    .join('');

  const table = rows
    ? `<table class="measurements"><thead><tr><th>Injetor</th><th>Volume</th><th>Spray</th></tr></thead><tbody>${rows}</tbody></table>`
    : '';

  return `${infoLine}${photosBlock}${table}`;
}

function renderProcedureSteps(
  steps: ReportProcedureStep[],
  photoLookup: Map<number, string>,
) {
  if (steps.length === 0) {
    return '<p class="muted">Nenhum teste estruturado registrado nesta OS.</p>';
  }

  return steps
    .map((step, index) => {
      let body: string;

      switch (step.test_type) {
        case 'compressao_mecanica':
          body = renderCompressaoBlock(step.data ?? {}, photoLookup);
          break;
        case 'leitura_dtc':
          body = renderDtcBlock(step.data ?? {});
          break;
        case 'bateria':
          body = renderBateriaBlock(step.data ?? {});
          break;
        case 'injetores_banco':
          body = renderInjetoresBlock(step.data ?? {}, photoLookup);
          break;
        default:
          body = renderMeasurementsTable(step.measurements);
      }

      return `
      <div class="step">
        <div class="step-header">
          <span class="step-number">${index + 1}.</span>
          <span class="step-title">${step.title}</span>
          ${
            step.verdict
              ? `<span class="badge badge-${step.verdict}">${verdictLabels[step.verdict] ?? step.verdict}</span>`
              : ''
          }
        </div>
        ${body}
        ${step.notes ? `<p class="step-notes">${step.notes}</p>` : ''}
      </div>`;
    })
    .join('');
}

function renderPhotos(photos: ReportPhoto[]) {
  if (photos.length === 0) return '';

  const pairs = photos
    .map(
      (photo) => `
      <div class="photo">
        <img src="${photo.dataUri}" />
        <p class="photo-label">${photo.label}</p>
      </div>`,
    )
    .join('');

  return `
    <section>
      <h2>Registro fotográfico</h2>
      <div class="photo-grid">${pairs}</div>
    </section>`;
}

function renderSummary(steps: ReportProcedureStep[]) {
  if (steps.length === 0) return '';

  const items = steps
    .map((step) => {
      const verdict = step.verdict ? ` — ${verdictLabels[step.verdict] ?? step.verdict}` : '';
      return `<li>${step.title}${verdict}</li>`;
    })
    .join('');

  return `
    <section>
      <h2>Resumo técnico</h2>
      <ul class="summary">${items}</ul>
    </section>`;
}

export function buildReportHtml(data: ReportData): string {
  const banner = data.finalVerdict ? finalVerdictBanner[data.finalVerdict] : null;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1f2937;
    font-size: 12px;
    margin: 0;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
    margin: 20px 0 10px;
  }
  section { margin-bottom: 12px; }
  .muted { color: #6b7280; }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .field {
    background: #f9fafb;
    border-radius: 8px;
    padding: 8px 10px;
  }
  .field-label { font-size: 9px; text-transform: uppercase; color: #6b7280; }
  .field-value { font-size: 13px; font-weight: bold; }
  .step {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
  }
  .step-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .step-number { font-weight: bold; }
  .step-title { font-weight: bold; flex: 1; }
  .badge {
    font-size: 10px;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 999px;
  }
  .badge-approved { background: #d1fae5; color: #065f46; }
  .badge-failed { background: #fee2e2; color: #991b1b; }
  .badge-inconclusive { background: #fef3c7; color: #92400e; }
  .badge-dtc-confirmado { background: #fee2e2; color: #991b1b; }
  .badge-dtc-intermitente { background: #fef3c7; color: #92400e; }
  .badge-dtc-passado { background: #dbeafe; color: #1e40af; }
  .badge-dtc-eliminado { background: #d1fae5; color: #065f46; }
  .cyl-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 6px;
  }
  .cyl-item { text-align: center; }
  .cyl-item img {
    width: 100%;
    height: 90px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }
  .cyl-photo-placeholder {
    height: 90px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border-radius: 6px;
    color: #9ca3af;
    font-size: 9px;
  }
  .cyl-number { font-size: 9px; color: #6b7280; margin: 4px 0 0; }
  .cyl-value { font-size: 12px; font-weight: bold; margin: 0; }
  .systems-ok { margin-top: 6px; font-size: 11px; color: #065f46; background: #ecfdf5; padding: 6px 8px; border-radius: 6px; }
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-top: 6px;
  }
  .metric-tile { background: #f9fafb; border-radius: 8px; padding: 8px; text-align: center; }
  .metric-value { font-size: 13px; font-weight: bold; margin: 0; }
  .metric-label { font-size: 9px; color: #6b7280; margin: 2px 0 0; }
  table.measurements { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.measurements th, table.measurements td {
    text-align: left;
    padding: 3px 6px;
    border-top: 1px solid #f0f0f0;
    font-size: 11px;
  }
  .step-notes { margin: 6px 0 0; font-size: 11px; color: #374151; }
  .photo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .photo img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
  .photo-label { font-size: 10px; color: #6b7280; margin: 4px 0 0; }
  .summary { margin: 0; padding-left: 18px; font-size: 11px; }
  .summary li { margin-bottom: 3px; }
  .banner {
    margin-top: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    color: #fff;
    font-weight: bold;
    text-align: center;
  }
</style>
</head>
<body>
  <h1>Laudo Técnico</h1>
  <p class="muted">${data.tenantName}${data.tenantCnpj ? ` — CNPJ ${data.tenantCnpj}` : ''}</p>

  <section class="grid">
    <div class="field"><div class="field-label">Veículo</div><div class="field-value">${data.car.brand} ${data.car.model}</div></div>
    <div class="field"><div class="field-label">Ano</div><div class="field-value">${data.car.year}</div></div>
    <div class="field"><div class="field-label">Placa</div><div class="field-value">${data.car.plate}</div></div>
    <div class="field"><div class="field-label">Cor</div><div class="field-value">${data.car.color}</div></div>
    <div class="field"><div class="field-label">Combustível</div><div class="field-value">${data.car.fuel_type}</div></div>
    <div class="field"><div class="field-label">Quilometragem</div><div class="field-value">${(data.car.mileage_in ?? 0).toLocaleString('pt-BR')} km</div></div>
    <div class="field"><div class="field-label">Data de abertura</div><div class="field-value">${formatDate(data.createdAt)}</div></div>
    <div class="field"><div class="field-label">Data do laudo</div><div class="field-value">${formatDate(data.finishedAt ?? new Date())}</div></div>
  </section>

  <section>
    <h2>Queixa relatada</h2>
    <p>${data.clientComplaint || 'Sem relato informado.'}</p>
  </section>

  ${renderPhotos(data.photos)}

  <section>
    <h2>Procedimento realizado</h2>
    ${renderProcedureSteps(data.procedureSteps, data.photoLookup)}
  </section>

  ${
    data.rootCause
      ? `<section><h2>Causa raiz identificada</h2><p>${data.rootCause}</p></section>`
      : ''
  }

  <section>
    <h2>Conclusão</h2>
    <p>${data.conclusion || 'Sem observações finais registradas.'}</p>
    ${banner ? `<div class="banner" style="background:${banner.color}">${banner.text}</div>` : ''}
  </section>

  ${renderSummary(data.procedureSteps)}
</body>
</html>`;
}

export function buildHeaderTemplate(tenantName: string): string {
  return `
    <div style="font-size:9px; width:100%; padding:0 32px; display:flex; justify-content:space-between; color:#6b7280; font-family:Arial,Helvetica,sans-serif;">
      <span><strong>${tenantName}</strong> — Laudo Técnico</span>
      <span>Diagnóstico automotivo especializado</span>
    </div>`;
}

export function buildFooterTemplate(tenantName: string): string {
  return `
    <div style="font-size:9px; width:100%; padding:0 32px; display:flex; justify-content:space-between; color:#6b7280; font-family:Arial,Helvetica,sans-serif;">
      <span>${tenantName} — Laudo Técnico Confidencial</span>
      <span>Página <span class="pageNumber"></span>/<span class="totalPages"></span></span>
    </div>`;
}
