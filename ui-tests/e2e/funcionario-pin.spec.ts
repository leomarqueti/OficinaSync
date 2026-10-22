import { expect, test } from '@playwright/test';
import { api } from './helpers';

// Funcionário sem e-mail: o dono cadastra com celular, manda o link (WhatsApp/QR), o funcionário cria um PIN
// e passa a entrar com celular + PIN (spec docs/superpowers/specs/2026-10-21-funcionario-sem-email-design.md).
const phoneDigits = () => `149${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

test('dono cadastra o Toninho pelo celular; ele cria o PIN, entra com celular + PIN e perde o acesso ao ser desativado', async ({ page, browser }) => {
  const digits = phoneDigits();
  await page.goto('/equipe');
  await page.getByRole('button', { name: 'Adicionar funcionário' }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Nome').fill('Toninho');
  await form.locator('#phone').fill(digits);
  await form.getByRole('button', { name: 'Gerar acesso' }).click();

  const wa = form.getByRole('link', { name: /mandar no whatsapp/i });
  await expect(wa).toBeVisible();
  expect(await wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/55\d+\?text=/);
  await expect(form.getByRole('img', { name: /qr code/i })).toBeVisible();
  await expect(form.getByText(/vale por 24 horas/i)).toBeVisible();
  const text = decodeURIComponent((await wa.getAttribute('href'))!.split('?text=')[1]);
  const link = text.match(/https?:\/\/\S+convite\?token=\w+/)![0];

  // o Toninho abre o link no celular dele (sem sessão)
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const toninho = await ctx.newPage();
  await toninho.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await expect(toninho.getByText(/Toninho/).first()).toBeVisible();
  await toninho.getByLabel('Crie seu PIN de 6 números').fill('123456');
  await toninho.getByLabel('Repita o PIN').fill('123456');
  await expect(toninho.getByText(/PIN fácil demais/)).toBeVisible();
  await expect(toninho.getByRole('button', { name: /entrar/i })).toBeDisabled();
  await toninho.getByLabel('Crie seu PIN de 6 números').fill('482915');
  await toninho.getByLabel('Repita o PIN').fill('482915');
  await toninho.getByRole('button', { name: /entrar/i }).click();
  await expect(toninho).toHaveURL(/\/dashboard$/);

  // sai e entra de novo com celular + PIN
  await toninho.evaluate(() => localStorage.removeItem('token'));
  await toninho.goto('/login');
  await toninho.getByRole('tab', { name: 'Entrar com celular' }).click();
  await toninho.locator('#phone').fill(digits);
  await toninho.getByLabel('PIN').fill('482915');
  await toninho.getByRole('button', { name: 'Entrar' }).click();
  await expect(toninho).toHaveURL(/\/dashboard$/);

  // o dono desativa: o Toninho não entra mais
  await page.reload();
  const row = page.getByRole('listitem').filter({ hasText: 'Toninho' });
  await row.getByRole('button', { name: 'Desativar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Desativar' }).click();
  await expect(row.getByText('Desativado')).toBeVisible();

  await toninho.evaluate(() => localStorage.removeItem('token'));
  await toninho.goto('/login');
  await toninho.getByRole('tab', { name: 'Entrar com celular' }).click();
  await toninho.locator('#phone').fill(digits);
  await toninho.getByLabel('PIN').fill('482915');
  await toninho.getByRole('button', { name: 'Entrar' }).click();
  await expect(toninho.getByText(/Acesso desativado/)).toBeVisible();
  await ctx.close();

  // limpeza leve: reativar não é necessário; confere pela API que ele está inativo
  const members = await api(page, 'GET', '/users/members');
  expect(members.json.find((m: { name: string }) => m.name === 'Toninho' && m.phone?.endsWith(digits.slice(-8))).is_active).toBe(false);
});
