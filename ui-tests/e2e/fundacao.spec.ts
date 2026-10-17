import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:3100';

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

async function openOrder(page: Page): Promise<number> {
  await page.goto('/dashboard');
  const car = await api(page, 'POST', '/cars', { plate: randomPlate() });
  const order = await api(page, 'POST', '/service_orders', { car_id: car.json.car_id, client_complaint: 'Teste visual' });
  return order.json.service_order_id;
}

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('fundação visual', () => {
  test('telas principais têm fundo escuro (nenhuma tela clara esquecida)', async ({ page }) => {
    const orderId = await openOrder(page);
    for (const route of ['/dashboard', '/clientes', '/veiculos', '/comissoes', '/configuracoes', '/equipe', '/os-client-create', `/os/${orderId}`, `/os/${orderId}/finalizar`]) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(await bodyBg(page), `fundo de ${route}`).toBe('rgb(10, 10, 10)');
      const lightBlock = await page.evaluate(() =>
        [...document.querySelectorAll('div')].some((d) => getComputedStyle(d).backgroundColor === 'rgb(245, 245, 245)'),
      );
      expect(lightBlock, `${route} não pode ter bloco cinza-claro (bg-neutral-100)`).toBe(false);
    }
  });

  test('títulos usam a letra da marca (Saira Condensed) e o texto corrido a Archivo', async ({ page }) => {
    await page.goto('/configuracoes');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    expect(await h1.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Saira Condensed');
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Archivo');
  });

  test('favicon é a engrenagem nova', async ({ page }) => {
    const res = await page.request.get('/favicon.svg');
    expect(await res.text()).toContain('data-brand="oficinasync-gear"');
  });
});

test.describe('duas caras — mecânico', () => {
  test.use({ storageState: 'e2e/.auth/mechanic.json' });

  test('mecânico entra no modo simples: barra embaixo, sem menu lateral', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Abrir carro novo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abrir ou fechar menu' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver como mecânico' })).toHaveCount(0);
  });

  test('mecânico abre /comissoes direto pelo link: carrega dentro do modo simples', async ({ page }) => {
    await page.goto('/comissoes');
    await expect(page.getByRole('heading', { name: /minhas comissões/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  });

  test('"+ Carro" abre o cadastro de OS', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Abrir carro novo' }).click();
    await expect(page).toHaveURL(/\/os-client-create$/);
  });
});

test.describe('duas caras — dono', () => {
  test('dono entra no modo controle e troca pro modo mecânico; a escolha sobrevive ao recarregar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Abrir ou fechar menu' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Ver como mecânico' }).first().click();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

    await page.getByRole('button', { name: 'Ver modo controle' }).click();
    await expect(page.getByRole('button', { name: 'Abrir ou fechar menu' }).first()).toBeVisible();
  });

  test('nome longo da oficina não estoura a tela no celular', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
