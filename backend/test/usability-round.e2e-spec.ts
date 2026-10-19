import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, generateCpf, openOrderAs, type World } from './helpers/fixtures';

// Regressões da rodada de usabilidade simulada (Seu Zé / Dona Cida, 2026-10-17).
describe('rodada de usabilidade — backend', () => {
  let app: INestApplication;
  let a: Owner;
  let aw: World;

  const server = () => app.getHttpServer();
  const auth = () => ({ Authorization: `Bearer ${a.token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'ur');
    aw = await createWorld(app, a.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('datas coerentes: etapa criada e publicada agora mostram o mesmo horário (sem 3h de diferença)', async () => {
    const { orderId } = await openOrderAs(app, a.token);
    const section = await request(server())
      .post('/sections')
      .set(auth())
      .send({ service_order_id: orderId, type: 'diagnosis', notes: 'teste de horário' })
      .expect(201);
    await request(server()).patch(`/sections/${section.body.section_id}/publish`).set(auth()).expect(200);

    const order = await request(server()).get(`/service_orders/${orderId}`).set(auth()).expect(200);
    const s = order.body.sections.find((x: { section_id: number }) => x.section_id === section.body.section_id);
    const created = new Date(s.created_at).getTime();
    const published = new Date(s.published_at).getTime();
    const now = Date.now();

    expect(Math.abs(published - created)).toBeLessThan(5 * 60 * 1000);
    expect(Math.abs(now - created)).toBeLessThan(5 * 60 * 1000);
    expect(Math.abs(now - new Date(order.body.created_at).getTime())).toBeLessThan(5 * 60 * 1000);
  });

  it('CPF já usado por outro cliente: 409 explica e devolve o cliente existente pra reaproveitar', async () => {
    const res = await request(server())
      .post('/clients')
      .set(auth())
      .send({ name: 'Outro Nome', phone: '+5514997001122', cpf: aw.cpf, address: 'Rua B, 2' })
      .expect(409);
    expect(res.body.message).toMatch(/CPF/);
    expect(res.body.message).toContain(aw.clientName);
    expect(res.body.existing_client).toEqual({ client_id: aw.clientId, name: aw.clientName });
  });

  it('busca de veículo acha pelo nome do dono (sem acento e sem diferenciar maiúscula)', async () => {
    const name = `Antônio ${generateCpf().slice(0, 5)}`;
    const client = await request(server())
      .post('/clients')
      .set(auth())
      .send({ name })
      .expect(201);
    const car = await request(server())
      .post('/cars')
      .set(auth())
      .send({ plate: `ANT${Math.floor(1000 + Math.random() * 8999)}`, client_id: client.body.client_id })
      .expect(201);

    const res = await request(server()).get('/cars').query({ search: name.toLowerCase().replace('ô', 'o') }).set(auth()).expect(200);
    expect(res.body.map((c: { car_id: number }) => c.car_id)).toContain(car.body.car_id);
  });
});
