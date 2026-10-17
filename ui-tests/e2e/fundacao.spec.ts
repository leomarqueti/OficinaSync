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
