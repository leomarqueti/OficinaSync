import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import {
  createPartialOrder,
  createWorld,
  generateCpf,
} from './helpers/fixtures';

describe('finalizar exige os dados completos', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;

  const server = () => app.getHttpServer();
  const authA = () => ({ Authorization: `Bearer ${a.token}` });
  const finish = (orderId: number, token = a.token) =>
    request(server())
      .patch(`/service_orders/${orderId}/finish`)
      .set({ Authorization: `Bearer ${token}` })
      .send({ conclusion: 'ok', final_verdict: 'resolved' });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'fa');
    b = await createTenantWithOwner(app, 'fb');
  });

  afterAll(async () => {
    await app.close();
  });

  it('OS incompleta → 409 com a lista do que falta, e a OS continua aberta', async () => {
    const o = await createPartialOrder(app, a.token);

    const res = await finish(o.orderId).expect(409);

    expect(res.body.missing_data.client).toHaveLength(4);
    expect(res.body.missing_data.car).toHaveLength(7);

    const order = await request(server())
      .get(`/service_orders/${o.orderId}`)
      .set(authA())
      .expect(200);
    expect(order.body.status).toBe('open');
    expect(order.body.finished_at).toBeNull();
  });

  it('depois de completar os dados, finaliza (200 e status done)', async () => {
    const o = await createPartialOrder(app, a.token);

    await request(server())
      .patch(`/service_orders/${o.orderId}/complete-data`)
      .set(authA())
      .send({
        client: {
          name: 'Seu João',
          phone: '+5514997951011',
          cpf: generateCpf(),
          address: 'Rua Final, 9',
        },
        car: {
          brand: 'Ford',
          model: 'Ka',
          year: 2015,
          fuel_type: 'flex',
          color: 'Vermelho',
          chassis: '9BFZZZ54ZFB123456',
          mileage_in: 80000,
        },
      })
      .expect(200);

    await finish(o.orderId).expect(200);

    const order = await request(server())
      .get(`/service_orders/${o.orderId}`)
      .set(authA())
      .expect(200);
    expect(order.body.status).toBe('done');
  });

  it('OS completa do fluxo antigo continua finalizando normalmente', async () => {
    const w = await createWorld(app, a.token);
    await finish(w.orderId).expect(200);
  });

  it('finalizar a OS INCOMPLETA de outra oficina é 403 (tenant vence 409)', async () => {
    const o = await createPartialOrder(app, b.token);
    await finish(o.orderId, a.token).expect(403);
  });
});
