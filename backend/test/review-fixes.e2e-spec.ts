import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createPartialOrder } from './helpers/fixtures';

// Regressões achadas na revisão final da abertura rápida de OS.
describe('abertura rápida — correções da revisão final', () => {
  let app: INestApplication;
  let a: Owner;

  const server = () => app.getHttpServer();
  const auth = () => ({ Authorization: `Bearer ${a.token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'rv');
  });

  afterAll(async () => {
    await app.close();
  });

  it('ano 0 é recusado (400) ao editar o carro', async () => {
    const o = await createPartialOrder(app, a.token);
    await request(server())
      .patch(`/cars/${o.carId}`)
      .set(auth())
      .send({ year: 0 })
      .expect(400);
  });

  it('ano 0 é recusado (400) ao criar o carro', async () => {
    await request(server())
      .post('/cars')
      .set(auth())
      .send({ plate: 'ZZZ1Z11', year: 0 })
      .expect(400);
  });

  it('ano 0 é recusado (400) no complete-data', async () => {
    const o = await createPartialOrder(app, a.token);
    await request(server())
      .patch(`/service_orders/${o.orderId}/complete-data`)
      .set(auth())
      .send({ car: { year: 0 } })
      .expect(400);
  });

  it('POST /cars com client_id null não liga cliente nenhum', async () => {
    const res = await request(server())
      .post('/cars')
      .set(auth())
      .send({ plate: 'NUL1L11', client_id: null })
      .expect(201);
    expect(res.body.client_id).toBeNull();
  });

  it('complete-data com client_id null não liga um cliente qualquer', async () => {
    const o = await createPartialOrder(app, a.token);
    // existe cliente na oficina — null não pode "achar o primeiro da tabela"
    await request(server())
      .post('/clients')
      .set(auth())
      .send({ name: 'Cliente Qualquer' })
      .expect(201);

    await request(server())
      .patch(`/service_orders/${o.orderId}/complete-data`)
      .set(auth())
      .send({ client_id: null })
      .expect(200);

    const order = await request(server())
      .get(`/service_orders/${o.orderId}`)
      .set(auth())
      .expect(200);
    expect(order.body.client).toBeNull();
  });

  it('null em campos do carro/cliente não dá 500', async () => {
    const o = await createPartialOrder(app, a.token, { clientName: 'Nulo' });
    await request(server())
      .patch(`/service_orders/${o.orderId}/complete-data`)
      .set(auth())
      .send({ car: { brand: null }, client: { address: null, cpf: null } })
      .expect(200);
  });

  // Bug que já existia: o parâmetro do ILike herdava varchar(7) da coluna plate e
  // '%PLACA7%' (9 chars) estourava no SQL Server (500) — buscar a placa inteira nunca funcionou.
  it('GET /cars?search=<placa inteira> acha o carro (200), não dá 500', async () => {
    const o = await createPartialOrder(app, a.token);

    const res = await request(server())
      .get(`/cars?search=${o.plate}`)
      .set(auth())
      .expect(200);

    expect(res.body.map((c: { car_id: number }) => c.car_id)).toContain(o.carId);
  });
});
