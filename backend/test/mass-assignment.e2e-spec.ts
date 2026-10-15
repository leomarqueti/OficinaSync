import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, generateCpf, type World } from './helpers/fixtures';
import { Users } from '../src/modules/users/users.entity';

describe('mass assignment (campos extras no corpo não podem virar coluna)', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let aw: World;
  let bw: World;

  const server = () => app.getHttpServer();
  const auth = (o: Owner) => ({ Authorization: `Bearer ${o.token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'ma');
    b = await createTenantWithOwner(app, 'mb');
    aw = await createWorld(app, a.token);
    bw = await createWorld(app, b.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register com tenant/is_active/role injetados cria usuário SEM oficina e INATIVO', async () => {
    const email = `mass-${randomUUID().slice(0, 8)}@teste.local`;

    await request(server())
      .post('/auth/register')
      .send({
        name: 'Atacante',
        email,
        password: 'Teste@12345',
        tenant: { id: b.tenant.id },
        is_active: true,
        role: 'owner',
      })
      .expect(201);

    const row = await app
      .get(DataSource)
      .getRepository(Users)
      .findOneOrFail({ where: { email }, relations: { tenant: true } });

    expect(row.tenant).toBeNull();
    expect(row.is_active).toBe(false);
  });

  it('POST /auth/register com user_id de outro usuário NÃO sobrescreve a conta da vítima', async () => {
    await request(server())
      .post('/auth/register')
      .send({
        name: 'Atacante',
        email: `mass-${randomUUID().slice(0, 8)}@teste.local`,
        password: 'Teste@12345',
        user_id: b.user.user_id,
      })
      .expect(201);

    const victim = await app
      .get(DataSource)
      .getRepository(Users)
      .findOneByOrFail({ user_id: b.user.user_id });

    expect(victim.email).toBe(b.email);

    await request(server())
      .post('/auth/login')
      .send({ email: b.email, password: b.password })
      .expect(200);
  });

  it('PATCH /cars/:id com "client" de outra oficina NÃO religa o carro ao cliente da B', async () => {
    await request(server())
      .patch(`/cars/${aw.carId}`)
      .set(auth(a))
      .send({ color: 'Azul', client: { client_id: bw.clientId } })
      .expect(200);

    const order = await request(server())
      .post('/service_orders')
      .set(auth(a))
      .send({ car_id: aw.carId, client_complaint: 'teste' })
      .expect(201);

    const read = await request(server())
      .get(`/service_orders/${order.body.service_order_id}`)
      .set(auth(a))
      .expect(200);

    expect(read.body.client.name).toBe(aw.clientName);
    expect(JSON.stringify(read.body)).not.toContain(bw.cpf);
  });

  it('PATCH /cars/:id com car_id da B NÃO sequestra o carro da B', async () => {
    await request(server())
      .patch(`/cars/${aw.carId}`)
      .set(auth(a))
      .send({ car_id: bw.carId, color: 'Sequestrado' })
      .expect(200);

    const own = await request(server())
      .get(`/cars/${bw.carId}`)
      .set(auth(b))
      .expect(200);

    expect(own.body.color).toBe('Prata');
  });

  it('PATCH /clients/:id com tenant da B NÃO move o cliente da A para a B', async () => {
    await request(server())
      .patch(`/clients/${aw.clientId}`)
      .set(auth(a))
      .send({ address: 'Rua Nova, 2', tenant: { id: b.tenant.id } })
      .expect(200);

    const bList = await request(server()).get('/clients').set(auth(b)).expect(200);
    expect(JSON.stringify(bList.body)).not.toContain(aw.clientName);
  });

  it('POST /clients com client_id da B NÃO sobrescreve o cliente da B', async () => {
    await request(server())
      .post('/clients')
      .set(auth(a))
      .send({
        client_id: bw.clientId,
        name: 'Sobrescrito',
        phone: '+5514997951011',
        cpf: generateCpf(),
        address: 'Rua do Atacante, 9',
      })
      .expect(201);

    const bList = await request(server()).get('/clients').set(auth(b)).expect(200);
    expect(JSON.stringify(bList.body)).toContain(bw.clientName);
    expect(JSON.stringify(bList.body)).not.toContain('Sobrescrito');
  });

  it('POST /cars com car_id da B NÃO sobrescreve o carro da B', async () => {
    await request(server())
      .post('/cars')
      .set(auth(a))
      .send({
        car_id: bw.carId,
        plate: 'ZZZ9Z99',
        brand: 'Fiat',
        model: 'Uno',
        year: 2012,
        fuel_type: 'flex',
        chassis: randomUUID().replace(/-/g, '').slice(0, 17),
        color: 'Sobrescrito',
        mileage_in: 1,
        client_id: aw.clientId,
      })
      .expect(201);

    const own = await request(server())
      .get(`/cars/${bw.carId}`)
      .set(auth(b))
      .expect(200);

    expect(own.body.plate).toBe(bw.plate);
    expect(own.body.color).toBe('Prata');
  });
});
