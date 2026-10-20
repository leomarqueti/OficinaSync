import { expect, test, type Page } from '@playwright/test';

// Tela da OS "uma etapa por vez" (spec docs/superpowers/specs/2026-10-20-tela-da-os-modo-simples-design.md)
const API = 'http://localhost:3100';
const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digit = () => String(Math.floor(Math.random() * 10));
  return `${letter()}${letter()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}

async function api(page: Page, method: string, path: string, body?: object) {
  return page.evaluate(
    async ({ method, path, body, API }) => {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, json: await res.json().catch(() => null) };
    },
    { method, path, body, API },
  );
}

async function uploadPhoto(page: Page, sectionId: number, label: string) {
  const status = await page.evaluate(
    async ({ sectionId, label, API, png }) => {
      const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: 'image/png' }), 'foto.png');
      form.append('section_id', String(sectionId));
      form.append('type', 'photo');
      form.append('label', label);
      const res = await fetch(`${API}/medias`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      });
      return res.status;
    },
    { sectionId, label, API, png: PNG_1PX },
  );
  expect(status).toBeLessThan(300);
}

/** OS como sai da abertura guiada: check-in publicado com a foto da frente. */
async function openedOrder(page: Page): Promise<number> {
  await page.goto('/dashboard');
  const car = await api(page, 'POST', '/cars', { plate: randomPlate(), brand: 'Volkswagen', model: 'Gol', year: 2015 });
  const order = await api(page, 'POST', '/service_orders', { car_id: car.json.car_id, client_complaint: 'Luz da injeção acesa' });
  const orderId = order.json.service_order_id as number;
  const checkin = await api(page, 'POST', '/sections', { service_order_id: orderId, type: 'checkin', notes: 'Entrada' });
  await uploadPhoto(page, checkin.json.section_id, 'Frente do veículo');
  await api(page, 'PATCH', `/sections/${checkin.json.section_id}/publish`);
  return orderId;
}

const agora = (page: Page) => page.getByRole('region', { name: 'Agora' });

test.describe('tela da OS — uma etapa por vez', () => {
  test.use({ storageState: 'e2e/.auth/mechanic.json' });

  test('mostra como o carro chegou, a etapa da vez e a barra de baixo; voltar é grande', async ({ page }) => {
    const orderId = await openedOrder(page);
    await page.goto(`/os/${orderId}`);

    const chegou = page.getByRole('region', { name: 'Como o carro chegou' });
    await expect(chegou.getByText('Luz da injeção acesa')).toBeVisible();
    await expect(chegou.getByRole('button', { name: /frente do veículo/i })).toBeVisible();

    await expect(agora(page).getByRole('heading', { name: /diagnóstico/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

    const back = (await page.getByRole('button', { name: 'Voltar' }).boundingBox())!;
    expect(back.height).toBeGreaterThanOrEqual(48);
    expect(back.width).toBeGreaterThanOrEqual(48);

    // Finalizar não é o botão principal no meio do serviço
    await expect(page.getByRole('button', { name: 'Finalizar OS' })).toHaveCount(0);
  });

  test('etapa vazia não vai pro cliente e diz o que falta', async ({ page }) => {
    const orderId = await openedOrder(page);
    await page.goto(`/os/${orderId}`);
    await expect(agora(page).getByRole('button', { name: /pronto, mostrar ao cliente/i })).toBeDisabled();
    await expect(agora(page).getByText('Fale, tire uma foto ou faça um teste antes de mostrar ao cliente.')).toBeVisible();
  });

  test('Falar: o texto entra na etapa (criada sozinha) e "mostrar ao cliente" passa pro Reparo', async ({ page }) => {
    const orderId = await openedOrder(page);
    await page.goto(`/os/${orderId}`);

    await agora(page).getByRole('button', { name: 'Falar' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('textbox').fill('Bateria fraca, deu 11,2V');
    await sheet.getByRole('button', { name: 'Salvar' }).click();
    await expect(sheet).toHaveCount(0);
    await expect(agora(page).getByText('Bateria fraca, deu 11,2V')).toBeVisible();

    // falar de novo SOMA, não apaga
    await agora(page).getByRole('button', { name: 'Falar' }).click();
    await page.getByRole('dialog').getByRole('textbox').fill('Trocar a bateria');
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();
    await expect(agora(page).getByText('Bateria fraca, deu 11,2V')).toBeVisible();
    await expect(agora(page).getByText('Trocar a bateria')).toBeVisible();

    await agora(page).getByRole('button', { name: /pronto, mostrar ao cliente/i }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Mostrar' }).click();
    await expect(page.getByText('O cliente já pode ver', { exact: true })).toBeVisible();
    await expect(agora(page).getByRole('heading', { name: /reparo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /diagnóstico.*explicação/i })).toBeVisible();
  });

  test('etapa criada fora de ordem (rascunho) aparece e dá pra mostrar ao cliente', async ({ page }) => {
    await page.goto('/dashboard');
    const car = await api(page, 'POST', '/cars', { plate: randomPlate() });
    const order = await api(page, 'POST', '/service_orders', { car_id: car.json.car_id, client_complaint: 'OS antiga sem check-in' });
    const orderId = order.json.service_order_id as number;
    await api(page, 'POST', '/sections', { service_order_id: orderId, type: 'diagnosis', notes: 'Medi a bateria' });
    await page.goto(`/os/${orderId}`);

    await expect(agora(page).getByRole('heading', { name: /check-in/i })).toBeVisible();
    await page.getByRole('button', { name: /diagnóstico.*explicação/i }).click();
    await expect(page.getByText('Medi a bateria')).toBeVisible();
    await page.getByRole('button', { name: 'Publicar pro cliente' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Mostrar' }).click();
    await expect(page.getByText('O cliente já pode ver', { exact: true })).toBeVisible();
  });

  test('teste antes e depois: dá pra pegar a foto da galeria do celular (não só a câmera)', async ({ page }) => {
    const orderId = await openedOrder(page);
    await page.goto(`/os/${orderId}`);
    await agora(page).getByRole('button', { name: 'Teste' }).click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: /antes e depois/i }).click();

    // a galeria é um campo de arquivo SEM "capture" (com capture o Android só abre a câmera)
    const galeria = sheet.getByLabel('Foto ANTES: escolher da galeria');
    expect(await galeria.getAttribute('capture')).toBeNull();
    await galeria.setInputFiles({ name: 'antes.png', mimeType: 'image/png', buffer: Buffer.from(PNG_1PX, 'base64') });
    await expect(sheet.getByRole('img', { name: 'Foto ANTES' })).toBeVisible();
  });

  test('no fim, "Finalizar OS" vira o botão principal', async ({ page }) => {
    const orderId = await openedOrder(page);
    for (const type of ['diagnosis', 'repair', 'final']) {
      const s = await api(page, 'POST', '/sections', { service_order_id: orderId, type, notes: `feito ${type}` });
      await api(page, 'PATCH', `/sections/${s.json.section_id}/publish`);
    }
    await page.goto(`/os/${orderId}`);
    await expect(page.getByRole('heading', { name: /tudo pronto/i })).toBeVisible();
    await page.getByRole('button', { name: 'Finalizar OS' }).click();
    await expect(page).toHaveURL(new RegExp(`/os/${orderId}/finalizar$`));
  });

  test('as outras ações ficam no "Mais ações"', async ({ page }) => {
    const orderId = await openedOrder(page);
    await page.goto(`/os/${orderId}`);
    await page.getByRole('button', { name: 'Mais ações' }).click();
    const menu = page.getByRole('dialog', { name: 'Mais ações' });
    for (const name of ['Página do cliente', 'Copiar link', 'Laudo PDF', 'Peças e equipe', 'Finalizar OS']) {
      await expect(menu.getByRole('button', { name })).toBeVisible();
    }
  });
});
