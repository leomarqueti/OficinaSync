import { expect, test, type Page } from '@playwright/test';
import { api, generateCpf, randomPlate } from './helpers';

// Finalização da OS no padrão da abertura guiada: uma pergunta por tela, texto e fotos não se perdem.

async function completeOrder(page: Page): Promise<number> {
  await page.goto('/dashboard');
  const client = await api(page, 'POST', '/clients', {
    name: 'Cliente Finalizar',
    phone: '+5514999990000',
    cpf: generateCpf(),
    address: 'Rua A, 1',
  });
  const car = await api(page, 'POST', '/cars', {
    plate: randomPlate(),
    brand: 'Volkswagen',
    model: 'Gol',
    year: 2015,
    fuel_type: 'flex',
    color: 'Prata',
    chassis: '9BWZZZ377VT004251',
    mileage_in: 120000,
    client_id: client.json.client_id,
  });
  const order = await api(page, 'POST', '/service_orders', { car_id: car.json.car_id, client_complaint: 'Falhando' });
  return order.json.service_order_id as number;
}

async function takePhotos(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.getByRole('button', { name: /^tirar foto d/i }).click();
    const camera = page.getByRole('dialog', { name: /câmera/i });
    await expect(camera.locator('video')).toBeVisible();
    await camera.getByRole('button', { name: 'Disparar' }).click();
    await expect(camera).toHaveCount(0);
  }
}

test.describe('finalizar OS no passo a passo', () => {
  test('texto e fotos não se perdem se o app recarregar; finaliza com as 4 fotos de saída', async ({ page }) => {
    const orderId = await completeOrder(page);
    await page.goto(`/os/${orderId}/finalizar`);

    await expect(page.getByRole('heading', { name: /como terminou/i })).toBeVisible();
    await page.getByRole('button', { name: 'Resolvido', exact: true }).click();

    await expect(page.getByRole('heading', { name: /qual era a causa/i })).toBeVisible();
    await page.getByRole('textbox').fill('Vela gasta');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByRole('heading', { name: /como o carro saiu/i })).toBeVisible();
    await page.getByRole('textbox').fill('Motor redondo');

    // o app fecha/recarrega: o texto escrito volta
    await page.reload();
    await expect(page.getByRole('heading', { name: /como o carro saiu/i })).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveValue('Motor redondo');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // fotos de saída: câmera embutida, galeria disponível, e sobrevivem ao recarregar
    await expect(page.getByRole('heading', { name: /fotos de saída/i })).toBeVisible();
    expect(await page.getByText('Escolher da galeria').locator('input').getAttribute('capture')).toBeNull();
    await takePhotos(page, 2);
    await page.reload();
    await expect(page.getByRole('button', { name: /tirar foto do lado esquerdo/i })).toBeVisible();
    await takePhotos(page, 2);
    await page.getByRole('button', { name: 'Conferir', exact: true }).click();

    await expect(page.getByText('Vela gasta')).toBeVisible();
    await expect(page.getByText('Motor redondo')).toBeVisible();
    await page.getByRole('button', { name: 'Finalizar OS' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const order = (await api(page, 'GET', `/service_orders/${orderId}`)).json;
    expect(order.status).toBe('done');
    expect(order.root_cause).toBe('Vela gasta');
    expect(order.conclusion).toBe('Motor redondo');
    expect(order.final_verdict).toBe('resolved');
    const final = order.sections.find((s: { type: string }) => s.type === 'final');
    expect(final.medias.map((m: { label: string }) => m.label).sort()).toEqual(
      ['Frente na saída', 'Lado direito na saída', 'Lado esquerdo na saída', 'Traseira na saída'],
    );
  });

  test('sem as 4 fotos de saída não dá pra conferir, e diz qual falta', async ({ page }) => {
    const orderId = await completeOrder(page);
    await page.goto(`/os/${orderId}/finalizar`);
    await page.getByRole('button', { name: 'Resolvido em parte' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await takePhotos(page, 3);
    await expect(page.getByRole('button', { name: 'Conferir', exact: true })).toBeDisabled();
    await expect(page.getByText('Falta: foto do lado direito')).toBeVisible();
  });
});
