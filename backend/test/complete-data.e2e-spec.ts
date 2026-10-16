import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import {
  createPartialOrder,
  createWorld,
  generateCpf,
  type World,
} from './helpers/fixtures';

const fullCar = {
  brand: 'Fiat',
  model: 'Uno',
  year: 2008,
  fuel_type: 'flex',
  color: 'Branco',
  chassis: '9BD15822A8Y123456',
  mileage_in: 120000,
};

describe('PATCH /service_orders/:id/complete-data', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let bw: World;

  const server = () => app.getHttpServer();
  const authA = () => ({ Authorization: `Bearer ${a.token}` });
  const complete = (orderId: number, body: object) =>
    request(server())
      .patch(`/service_orders/${orderId}/complete-data`)
      .set(authA())
      .send(body);

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'cd');
    b = await createTenantWithOwner(app, 'ce');
    bw = await createWorld(app, b.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria o cliente e completa o carro numa chamada só → OS completa', async () => {
    const o = await createPartialOrder(app, a.token);

    const res = await complete(o.orderId, {
      client: {
        name: 'Sr. Antônio',
        phone: '+5514997951011',
        cpf: generateCpf(),
        address: 'Rua das Flores, 10',
      },
      car: fullCar,
    }).expect(200);

    expect(res.body.is_complete).toBe(true);
    expect(res.body.missing_data).toEqual({ client: [], car: [] });

    const order = await request(server())
      .get(`/service_orders/${o.orderId}`)
      .set(authA())
      .expect(200);
    expect(order.body.client.name).toBe('Sr. Antônio');
    expect(order.body.car.brand).toBe('Fiat');
    expect(order.body.is_complete).toBe(true);
  });

  it('completar só uma parte deixa o resto pendente', async () => {
    const o = await createPartialOrder(app, a.token, { clientName: 'Marcos' });

    const res = await complete(o.orderId, {
      car: { brand: 'VW', model: 'Gol' },
    }).expect(200);

    expect(res.body.is_complete).toBe(false);
    expect(res.body.missing_data.car.map((i: { field: string }) => i.field)).toEqual([
      'year',
      'fuel_type',
      'color',
      'chassis',
      'mileage_in',
    ]);
    expect(
      res.body.missing_data.client.map((i: { field: string }) => i.field),
    ).toEqual(['phone', 'cpf', 'address']);
  });

  it('completa o cliente que já existe (só com o nome) sem criar outro', async () => {
    const o = await createPartialOrder(app, a.token, { clientName: 'Bruna' });

    await complete(o.orderId, {
      client: {
        phone: '+5514997951011',
        cpf: generateCpf(),
        address: 'Av. Brasil, 5',
      },
      car: fullCar,
    }).expect(200);

    const order = await request(server())
      .get(`/service_orders/${o.orderId}`)
      .set(authA())
      .expect(200);
    expect(order.body.client.client_id).toBe(o.clientId);
    expect(order.body.client.name).toBe('Bruna');
    expect(order.body.is_complete).toBe(true);
  });

  it('client_id liga o cliente já cadastrado ao carro', async () => {
    const existing = await request(server())
      .post('/clients')
      .set(authA())
      .send({
        name: 'Cliente Antigo',
        phone: '+5514997951011',
        cpf: generateCpf(),
        address: 'Rua Velha, 1',
      })
      .expect(201);
    const o = await createPartialOrder(app, a.token);

    await complete(o.orderId, {
      client_id: existing.body.client_id,
      car: fullCar,
    }).expect(200);

    const order = await request(server())
      .get(`/service_orders/${o.orderId}`)
      .set(authA())
      .expect(200);
    expect(order.body.client.client_id).toBe(existing.body.client_id);
    expect(order.body.is_complete).toBe(true);
  });

  it('CPF que já é de OUTRO cliente → 409 com existing_client, sem duplicar nem sobrescrever', async () => {
    const cpf = generateCpf();
    const existing = await request(server())
      .post('/clients')
      .set(authA())
      .send({
        name: 'Dono do CPF',
        phone: '+5514997951011',
        cpf,
        address: 'Rua X, 1',
      })
      .expect(201);
    const o = await createPartialOrder(app, a.token, {
      clientName: 'Outro Nome',
    });

    const res = await complete(o.orderId, { client: { cpf } }).expect(409);

    expect(res.body.existing_client).toEqual({
      client_id: existing.body.client_id,
      name: 'Dono do CPF',
    });

    const order = await request(server())
      .get(`/service_orders/${o.orderId}`)
      .set(authA())
      .expect(200);
    expect(order.body.client.name).toBe('Outro Nome');
    expect(order.body.client.cpf).toBeNull();
  });

  it('o próprio CPF do cliente da OS não conflita consigo mesmo', async () => {
    const cpf = generateCpf();
    const o = await createPartialOrder(app, a.token, {
      clientName: 'Eu Mesmo',
    });
    await complete(o.orderId, { client: { cpf } }).expect(200);
    await complete(o.orderId, {
      client: { cpf, address: 'Nova rua, 3' },
    }).expect(200);
  });

  it('client_id e client juntos → 400', async () => {
    const o = await createPartialOrder(app, a.token);
    await complete(o.orderId, {
      client_id: 1,
      client: { name: 'X' },
    }).expect(400);
  });

  it('carro sem cliente e sem nome pra criar → 400', async () => {
    const o = await createPartialOrder(app, a.token);
    await complete(o.orderId, {
      client: { phone: '+5514997951011' },
    }).expect(400);
  });

  it('dados inválidos continuam recusados (CPF, ano)', async () => {
    const o = await createPartialOrder(app, a.token, {
      clientName: 'Valida',
    });
    await complete(o.orderId, { client: { cpf: '111.111.111-11' } }).expect(
      400,
    );
    await complete(o.orderId, { car: { year: 'abc' } }).expect(400);
  });

  it('campos extras (tenant, car_id) no corpo não têm efeito', async () => {
    const o = await createPartialOrder(app, a.token);
    await complete(o.orderId, {
      car: { ...fullCar, car_id: bw.carId, tenant: { id: b.tenant.id } },
    }).expect(200);

    const bCar = await request(server())
      .get(`/cars/${bw.carId}`)
      .set({ Authorization: `Bearer ${b.token}` })
      .expect(200);
    expect(bCar.body.color).toBe('Prata');
  });

  it('isolamento: A não completa a OS da B, nem liga o cliente da B à OS da A', async () => {
    await complete(bw.orderId, { car: { color: 'hack' } }).expect(403);

    const o = await createPartialOrder(app, a.token);
    await complete(o.orderId, { client_id: bw.clientId }).expect(403);
  });
});
