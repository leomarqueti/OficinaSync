import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, generateCpf, type World } from './helpers/fixtures';

describe('cliente e carro parciais', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let bw: World;

  const server = () => app.getHttpServer();
  const authA = () => ({ Authorization: `Bearer ${a.token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'pa');
    b = await createTenantWithOwner(app, 'pb');
    bw = await createWorld(app, b.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('cliente só com o nome → 201 e o resto nulo', async () => {
    const res = await request(server())
      .post('/clients')
      .set(authA())
      .send({ name: 'Marcos' })
      .expect(201);

    expect(res.body.name).toBe('Marcos');
    expect(res.body.phone).toBeNull();
    expect(res.body.cpf).toBeNull();
    expect(res.body.address).toBeNull();
  });

  it('dois clientes SEM CPF no mesmo tenant não geram conflito', async () => {
    await request(server()).post('/clients').set(authA()).send({ name: 'Sem CPF 1' }).expect(201);
    await request(server()).post('/clients').set(authA()).send({ name: 'Sem CPF 2' }).expect(201);
  });

  it('dois clientes com o MESMO CPF continuam em conflito (409)', async () => {
    const cpf = generateCpf();
    await request(server())
      .post('/clients')
      .set(authA())
      .send({ name: 'Com CPF 1', cpf })
      .expect(201);
    await request(server())
      .post('/clients')
      .set(authA())
      .send({ name: 'Com CPF 2', cpf })
      .expect(409);
  });

  it('nome continua obrigatório no cliente', async () => {
    await request(server())
      .post('/clients')
      .set(authA())
      .send({ phone: '+5514997951011' })
      .expect(400);
  });

  it('CPF e telefone inválidos continuam recusados quando enviados', async () => {
    await request(server())
      .post('/clients')
      .set(authA())
      .send({ name: 'CPF Ruim', cpf: '111.111.111-11' })
      .expect(400);
    await request(server())
      .post('/clients')
      .set(authA())
      .send({ name: 'Fone Ruim', phone: '123' })
      .expect(400);
  });

  it('carro só com a placa e sem cliente → 201, client_id e demais campos nulos', async () => {
    const res = await request(server())
      .post('/cars')
      .set(authA())
      .send({ plate: 'ABC1D23' })
      .expect(201);

    expect(res.body.plate).toBe('ABC1D23');
    expect(res.body.client_id).toBeNull();
    expect(res.body.brand).toBeNull();
    expect(res.body.year).toBeNull();
    expect(res.body.mileage_in).toBeNull();
  });

  it('a placa continua obrigatória no carro', async () => {
    await request(server()).post('/cars').set(authA()).send({ brand: 'Fiat' }).expect(400);
  });

  it('carro com o cliente de OUTRA oficina continua 403', async () => {
    await request(server())
      .post('/cars')
      .set(authA())
      .send({ plate: 'ZZZ9Z99', client_id: bw.clientId })
      .expect(403);
  });

  it('abrir OS com carro parcial funciona', async () => {
    const car = await request(server())
      .post('/cars')
      .set(authA())
      .send({ plate: 'QWE4R56' })
      .expect(201);

    const order = await request(server())
      .post('/service_orders')
      .set(authA())
      .send({ car_id: car.body.car_id, client_complaint: 'Não pega de manhã' })
      .expect(201);

    expect(order.body.service_order_id).toBeGreaterThan(0);
  });
});
