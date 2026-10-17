import { expect, test } from '@playwright/test';

const API = 'http://localhost:3100';

function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digit = () => String(Math.floor(Math.random() * 10));
  return `${letter()}${letter()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}

test('a página pública do cliente pede para o Google não indexar (link vazado não vira resultado de busca)', async ({ page }) => {
  await page.goto('/dashboard');
  const token = await page.evaluate(
    async ({ API, plate }) => {
      const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` };
      const car = await (await fetch(`${API}/cars`, { method: 'POST', headers: auth, body: JSON.stringify({ plate }) })).json();
      const order = await (
        await fetch(`${API}/service_orders`, {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ car_id: car.car_id, client_complaint: 'Luz do painel acesa' }),
        })
      ).json();
      return order.public_token as string;
    },
    { API, plate: randomPlate() },
  );

  await page.goto(`/servico/${token}`);
  await expect(page.getByText(/Luz do painel acesa/).first()).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots).toContain('noindex');
});
