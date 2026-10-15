import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, type World } from './helpers/fixtures';

describe('vídeo de divulgação atrás de flag', () => {
  let app: INestApplication;
  let a: Owner;
  let aw: World;

  const auth = () => ({ Authorization: `Bearer ${a.token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'flag');
    aw = await createWorld(app, a.token);
  });

  afterAll(async () => {
    delete process.env.PROMO_VIDEO_ENABLED;
    await app.close();
  });

  it('desligado por padrão: 403 e a OS informa features.promo_video = false', async () => {
    delete process.env.PROMO_VIDEO_ENABLED;

    const res = await request(app.getHttpServer())
      .post(`/service_orders/${aw.orderId}/promo-video`)
      .set(auth())
      .expect(403);
    expect(res.body.message).toBe(
      'A geração de vídeo de divulgação não está disponível no seu plano.',
    );

    const order = await request(app.getHttpServer())
      .get(`/service_orders/${aw.orderId}`)
      .set(auth())
      .expect(200);
    expect(order.body.features).toEqual({ promo_video: false });
  });

  it('ligado: passa da flag (e cai na regra seguinte: sem vídeo na OS → 400) e features.promo_video = true', async () => {
    process.env.PROMO_VIDEO_ENABLED = 'true';

    const res = await request(app.getHttpServer())
      .post(`/service_orders/${aw.orderId}/promo-video`)
      .set(auth())
      .expect(400);
    expect(res.body.message).toBe('Nenhum vídeo enviado nas etapas desta OS ainda.');

    const order = await request(app.getHttpServer())
      .get(`/service_orders/${aw.orderId}`)
      .set(auth())
      .expect(200);
    expect(order.body.features).toEqual({ promo_video: true });
  });
});
