import { expect, test, type Page } from '@playwright/test';

// Abertura de OS guiada (uma pergunta por tela) — spec docs/superpowers/specs/2026-10-19-abertura-de-os-guiada-design.md
const API = 'http://localhost:3100';
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

function generateCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (new Set(base).size === 1) return generateCpf();
  const digit = (nums: number[]) => {
    const factor = nums.length + 1;
    const sum = nums.reduce((acc, n, i) => acc + n * (factor - i), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = digit(base);
  const d2 = digit([...base, d1]);
  return [...base, d1, d2].join('');
}

function randomPlate(): string {
  const l = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const d = () => String(Math.floor(Math.random() * 10));
  return `${l()}${l()}${l()}${d()}${l()}${d()}${d()}`;
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

async function start(page: Page) {
  await page.goto('/os-client-create');
  await page.evaluate(() => localStorage.removeItem('oficinasync_os_draft'));
  await page.reload();
}

const cont = (page: Page) => page.getByRole('button', { name: 'Continuar', exact: true }).last().click();

/** Placa nova → VW Gol 2013 → KM → pula opcionais → defeito: para na tela do cliente. */
async function newCarUntilClient(page: Page, plate: string) {
  await page.locator('#plate').fill(plate);
  await expect(page.getByText('Carro novo por aqui')).toBeVisible();
  await cont(page);
  await page.getByRole('button', { name: 'Volkswagen', exact: true }).click();
  await page.getByRole('button', { name: 'Gol', exact: true }).click();
  await page.getByRole('button', { name: '2013', exact: true }).click();
  await page.locator('#km').fill('123456');
  await cont(page);
  await cont(page); // opcionais
  await page.locator('#defect').fill('Barulho na suspensão dianteira');
  await cont(page);
  await expect(page.getByRole('heading', { name: /o cliente está aqui/i })).toBeVisible();
}

/** Tira as fotos pela câmera embutida (câmera simulada do navegador de teste). */
async function takeFourPhotos(page: Page, count = 4) {
  for (let i = 0; i < count; i++) {
    await page.getByRole('button', { name: /^tirar foto d/i }).click();
    const camera = page.getByRole('dialog', { name: /câmera/i });
    await expect(camera.locator('video')).toBeVisible();
    await camera.getByRole('button', { name: 'Disparar' }).click();
    await expect(camera).toHaveCount(0);
  }
}

test.describe('abertura de OS guiada', () => {
  test('carro novo, cliente não está: abre a OS e ela fica com dados pendentes', async ({ page }) => {
    await start(page);
    await newCarUntilClient(page, randomPlate());
    await page.getByRole('button', { name: /não, o escritório completa/i }).click();
    await takeFourPhotos(page);
    await page.getByRole('button', { name: 'Conferir', exact: true }).click();
    await expect(page.getByText('O escritório completa')).toBeVisible();
    await page.getByRole('button', { name: 'Abrir OS', exact: true }).click();
    await expect(page).toHaveURL(/\/os\/\d+$/);
    await expect(page.getByText('Dados pendentes')).toBeVisible();
  });

  test('placa conhecida (digitada minúscula e com hífen): reconhece, pula pro KM e não duplica o carro', async ({ page }) => {
    await page.goto('/dashboard');
    const plate = randomPlate();
    const owner = await api(page, 'POST', '/clients', { name: 'Seu Joao Teste' });
    await api(page, 'POST', '/cars', {
      plate, brand: 'Fiat', model: 'Uno', year: 2010, fuel_type: 'flex', color: 'Branco',
      chassis: '9BD15822A8Y123456', mileage_in: 80000, client_id: owner.json.client_id,
    });

    await start(page);
    await page.locator('#plate').fill(`${plate.slice(0, 3).toLowerCase()}-${plate.slice(3).toLowerCase()}`);
    await expect(page.getByText(/É o/)).toBeVisible();
    await page.getByRole('button', { name: 'Sim, é esse' }).click();
    await expect(page.getByRole('heading', { name: /quanto marca o painel/i })).toBeVisible();
    await expect(page.locator('#km')).toHaveValue('80.000');
    await page.locator('#km').fill('81000');
    await cont(page);
    await page.locator('#defect').fill('Luz da injeção acesa');
    await cont(page);
    await page.getByRole('button', { name: /sim, anotar/i }).click();
    await page.getByRole('button', { name: 'Sim, é ele' }).click();
    await takeFourPhotos(page);
    await page.getByRole('button', { name: 'Conferir', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir OS', exact: true }).click();
    await expect(page).toHaveURL(/\/os\/\d+$/);

    const cars = await api(page, 'GET', `/cars/by-plate/${plate}`);
    expect(cars.json).toHaveLength(1);
  });

  test('cliente presente com CPF de outro cliente: avisa e reaproveita o cadastro', async ({ page }) => {
    await page.goto('/dashboard');
    const cpf = generateCpf();
    const name = `Cliente CPF ${cpf.slice(0, 4)}`;
    await api(page, 'POST', '/clients', { name, phone: '+5514997001122', cpf, address: 'Rua A, 1' });

    await start(page);
    await newCarUntilClient(page, randomPlate());
    await page.getByRole('button', { name: /sim, anotar/i }).click();
    await page.locator('#cpf').fill(cpf);
    await expect(page.getByText(`Este CPF já é do cliente ${name}`)).toBeVisible();
    await page.getByRole('button', { name: 'Usar esse cadastro' }).click();
    await expect(page.getByText('Cliente já cadastrado')).toBeVisible();
  });

  test('OS no nome de quem trouxe; a OS antiga do carro continua com o dono', async ({ page }) => {
    await page.goto('/dashboard');
    const plate = randomPlate();
    const x = await api(page, 'POST', '/clients', { name: `Dono X ${plate}` });
    const y = await api(page, 'POST', '/clients', { name: `Filho Y ${plate}` });
    const car = await api(page, 'POST', '/cars', {
      plate, brand: 'Fiat', model: 'Uno', year: 2010, fuel_type: 'flex', color: 'Branco',
      chassis: '9BD15822A8Y123456', mileage_in: 80000, client_id: x.json.client_id,
    });
    const old = await api(page, 'POST', '/service_orders', { car_id: car.json.car_id, client_complaint: 'visita antiga' });

    await start(page);
    await page.locator('#plate').fill(plate);
    await page.getByRole('button', { name: 'Sim, é esse' }).click();
    await cont(page); // KM
    await page.locator('#defect').fill('Freio fazendo barulho');
    await cont(page);
    await page.getByRole('button', { name: /sim, anotar/i }).click();
    await page.getByRole('button', { name: 'Não, é outra pessoa' }).click();
    await page.locator('#client-search').fill(`Filho Y ${plate}`);
    await page.getByRole('button', { name: `Filho Y ${plate}` }).click();
    await cont(page);
    await takeFourPhotos(page);
    await page.getByRole('button', { name: 'Conferir', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir OS', exact: true }).click();
    await expect(page).toHaveURL(/\/os\/\d+$/);
    const newId = Number(page.url().split('/').pop());

    expect((await api(page, 'GET', `/service_orders/${newId}`)).json.client.client_id).toBe(y.json.client_id);
    expect((await api(page, 'GET', `/service_orders/${old.json.service_order_id}`)).json.client.client_id).toBe(x.json.client_id);
  });

  test('fotos são obrigatórias: com 3, o botão trava e diz qual falta', async ({ page }) => {
    await start(page);
    await newCarUntilClient(page, randomPlate());
    await page.getByRole('button', { name: /não, o escritório completa/i }).click();
    await takeFourPhotos(page, 3);
    await expect(page.getByRole('button', { name: 'Conferir', exact: true })).toBeDisabled();
    await expect(page.getByText('Falta: foto do lado direito')).toBeVisible();
  });

  test('defeito por escrito é obrigatório', async ({ page }) => {
    await start(page);
    await page.locator('#plate').fill(randomPlate());
    await cont(page);
    await page.getByRole('button', { name: 'Fiat', exact: true }).click();
    await page.getByRole('button', { name: 'Uno', exact: true }).click();
    await page.getByRole('button', { name: '2008', exact: true }).click();
    await page.locator('#km').fill('1000');
    await cont(page);
    await cont(page);
    await expect(page.getByRole('heading', { name: /o que o carro tem/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar', exact: true }).last()).toBeDisabled();
    await expect(page.getByText(/descrever o defeito/)).toBeVisible();
  });

  test('rascunho: saiu na tela do KM e voltou, continua de onde parou', async ({ page }) => {
    await start(page);
    const plate = randomPlate();
    await page.locator('#plate').fill(plate);
    await cont(page);
    await page.getByRole('button', { name: 'Volkswagen', exact: true }).click();
    await page.getByRole('button', { name: 'Gol', exact: true }).click();
    await page.getByRole('button', { name: '2013', exact: true }).click();
    await expect(page.getByRole('heading', { name: /quanto marca o painel/i })).toBeVisible();

    await page.goto('/dashboard'); // interrompido
    await page.goto('/os-client-create');
    await expect(page.getByRole('heading', { name: /quanto marca o painel/i })).toBeVisible();
    await expect(page.getByText('Rascunho recuperado')).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('oficinasync_os_draft') ?? '{}'));
    expect(saved.draft.state).toMatchObject({ plate, brand: 'Volkswagen', model: 'Gol', year: '2013' });
  });

  test('busca da placa falhou (4G): não vira "carro novo" — pede pra tentar de novo', async ({ page }) => {
    await start(page);
    let fail = true;
    await page.route('**/cars/by-plate/**', (route) => (fail ? route.abort() : route.continue()));
    await page.locator('#plate').fill(randomPlate());
    await expect(page.getByText(/não deu pra verificar a placa/i)).toBeVisible();
    await expect(page.getByText('Carro novo por aqui')).toHaveCount(0);
    fail = false;
    await page.getByRole('button', { name: 'Tentar de novo' }).click();
    await expect(page.getByText('Carro novo por aqui')).toBeVisible();
  });

  test('ditado: duas falas seguidas somam no defeito (não apaga a primeira)', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeRecognition {
        lang = '';
        interimResults = false;
        continuous = false;
        onresult: ((e: unknown) => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          const results: { 0: { transcript: string }; isFinal: boolean; length: number }[] = [];
          const say = (text: string, delay: number) =>
            setTimeout(() => {
              results.push({ 0: { transcript: text }, isFinal: true, length: 1 });
              this.onresult?.({ resultIndex: results.length - 1, results });
            }, delay);
          say('falha ao acelerar', 50);
          say('luz da injeção acesa', 400);
        }
        stop() {
          this.onend?.();
        }
      }
      // o Chrome atual já tem SpeechRecognition nativo (sem prefixo) — trocar os dois nomes
      Object.defineProperty(window, 'SpeechRecognition', { value: FakeRecognition, configurable: true, writable: true });
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: FakeRecognition, configurable: true, writable: true });
    });
    await start(page);
    await page.locator('#plate').fill(randomPlate());
    await cont(page);
    await page.getByRole('button', { name: 'Fiat', exact: true }).click();
    await page.getByRole('button', { name: 'Uno', exact: true }).click();
    await page.getByRole('button', { name: '2008', exact: true }).click();
    await page.locator('#km').fill('1000');
    await cont(page);
    await cont(page);
    await page.getByRole('button', { name: /falar em vez de escrever/i }).click();
    await expect(page.locator('#defect')).toHaveValue('falha ao acelerar luz da injeção acesa');
  });

  test('respondeu "o cliente não está" e ele chegou depois: dá pra voltar e anotar', async ({ page }) => {
    await start(page);
    await newCarUntilClient(page, randomPlate());
    await page.getByRole('button', { name: /não, o escritório completa/i }).click();
    await takeFourPhotos(page);
    await page.getByRole('button', { name: 'Conferir', exact: true }).click();
    await page.getByRole('button', { name: /o escritório completa/i }).click();
    await expect(page.getByRole('button', { name: /sim, anotar os dados/i })).toBeVisible();
  });

  test('fotos pela câmera embutida (sem sair da página) continuam lá se a página recarregar', async ({ page }) => {
    await start(page);
    await newCarUntilClient(page, randomPlate());
    await page.getByRole('button', { name: /não, o escritório completa/i }).click();
    await takeFourPhotos(page, 2);

    // Android sem memória fecha a página por trás: simula recarregando
    await page.reload();
    await expect(page.getByRole('heading', { name: /fotos do carro/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /tirar foto do lado esquerdo/i })).toBeVisible();

    await takeFourPhotos(page, 2);
    await expect(page.getByRole('button', { name: 'Conferir', exact: true })).toBeEnabled();
  });
});
