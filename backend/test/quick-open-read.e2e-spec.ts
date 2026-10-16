import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createPartialOrder, createWorld } from './helpers/fixtures';

const fields = (items: { field: string }[]) => items.map((i) => i.field);

describe('OS aberta no modo rápido (leituras)', () => {
  let app: INestApplication;
  let a: Owner;

  const server = () => app.getHttpServer();
  const auth = () => ({ Authorization: `Bearer ${a.token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'qr');
  });

  afterAll(async () => {
    await app.close();
  });

  it('só a placa: GET /service_orders/:id → 200, client null e tudo pendente', async () => {
    const o = await createPartialOrder(app, a.token);

    const res = await request(server())
      .get(`/service_orders/${o.orderId}`)
      .set(auth())
      .expect(200);

    expect(res.body.client).toBeNull();
    expect(res.body.is_complete).toBe(false);
    expect(fields(res.body.missing_data.client)).toEqual([
      'name',
      'phone',
      'cpf',
      'address',
    ]);
    expect(fields(res.body.missing_data.car)).toEqual([
      'brand',
      'model',
      'year',
      'fuel_type',
      'color',
      'chassis',
      'mileage_in',
    ]);
    expect(res.body.car.plate).toBe(o.plate);
  });

  it('cliente só com o nome: client vem preenchido e faltam telefone, CPF e endereço', async () => {
    const o = await createPartialOrder(app, a.token, { clientName: 'Marcos' });

    const res = await request(server())
      .get(`/service_orders/${o.orderId}`)
      .set(auth())
      .expect(200);

    expect(res.body.client.name).toBe('Marcos');
    expect(res.body.client.client_id).toBe(o.clientId);
    expect(fields(res.body.missing_data.client)).toEqual([
      'phone',
      'cpf',
      'address',
    ]);
  });

  it('a lista do dashboard não quebra e marca a OS como incompleta', async () => {
    const o = await createPartialOrder(app, a.token);

    const res = await request(server())
      .get('/service_orders/orders')
      .set(auth())
      .expect(200);

    const row = res.body.find(
      (r: { service_order_id: number }) => r.service_order_id === o.orderId,
    );
    expect(row).toBeDefined();
    expect(row.client).toBeNull();
    expect(row.is_complete).toBe(false);
    expect(row.missing_data.client).toHaveLength(4);
  });

  it('a página pública abre (200) com client null', async () => {
    const o = await createPartialOrder(app, a.token);

    const res = await request(server())
      .get(`/service_orders/public/${o.publicToken}`)
      .expect(200);

    expect(res.body.client).toBeNull();
    expect(res.body.car.plate).toBe(o.plate);
  });

  it('histórico por modelo com carro sem marca/modelo → 200 e lista vazia', async () => {
    const o = await createPartialOrder(app, a.token);

    const res = await request(server())
      .get(`/tests/history?car_id=${o.carId}&title=bateria`)
      .set(auth())
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('OS por carro (histórico do veículo) não quebra', async () => {
    const o = await createPartialOrder(app, a.token);
    await request(server())
      .get(`/service_orders/by-car/${o.carId}`)
      .set(auth())
      .expect(200);
  });

  it('OS completa (fluxo antigo): is_complete true e nada pendente', async () => {
    const w = await createWorld(app, a.token);

    const res = await request(server())
      .get(`/service_orders/${w.orderId}`)
      .set(auth())
      .expect(200);

    expect(res.body.is_complete).toBe(true);
    expect(res.body.missing_data).toEqual({ client: [], car: [] });
    expect(res.body.client.name).toBe(w.clientName);
  });
});
