import { expect, test, type Page } from '@playwright/test';

// Regressões da rodada de usabilidade simulada (Seu Zé / Dona Cida, 2026-10-17).
const API = 'http://localhost:3100';

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

test('OS: botão de mandar no WhatsApp e "Copiar link" avisa quando o celular não deixa copiar', async ({ page }) => {
  await page.goto('/dashboard');
  const car = await api(page, 'POST', '/cars', { plate: randomPlate() });
  const order = await api(page, 'POST', '/service_orders', { car_id: car.json.car_id, client_complaint: 'teste link' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('bloqueado')) },
      configurable: true,
    });
  });
  await page.goto(`/os/${order.json.service_order_id}`);

  const wa = page.getByRole('link', { name: /whatsapp/i });
  await expect(wa).toBeVisible();
  expect(await wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\?text=/);

  await page.getByRole('button', { name: 'Copiar link' }).click();
  await expect(page.getByText('Não deu pra copiar automático')).toBeVisible();
});

export { api, generateCpf, randomPlate };
