import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, openOrderAs, type World } from './helpers/fixtures';

// Opção A do Leonardo (2026-10-19): a OS guarda quem trouxe o carro naquela visita.
describe('OS com o próprio cliente', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let aw: World;
  let bw: World;
  const server = () => app.getHttpServer();
  const auth = () => ({ Authorization: `Bearer ${a.token}` });

  const newClient = async (name: string) =>
    (await request(server()).post('/clients').set(auth()).send({ name }).expect(201)).body.client_id as number;

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'oc');
    b = await createTenantWithOwner(app, 'od');
    aw = await createWorld(app, a.token);
    bw = await createWorld(app, b.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('OS no nome de quem trouxe; a OS antiga do carro continua com o dono anterior', async () => {
    const y = await newClient('Filho do Dono');
    const res = await request(server())
      .post('/service_orders')
      .set(auth())
      .send({ car_id: aw.carId, client_id: y, client_complaint: 'barulho' })
      .expect(201);

    const novo = await request(server()).get(`/service_orders/${res.body.service_order_id}`).set(auth()).expect(200);
    expect(novo.body.client.name).toBe('Filho do Dono');

    const antiga = await request(server()).get(`/service_orders/${aw.orderId}`).set(auth()).expect(200);
    expect(antiga.body.client.name).toBe(aw.clientName);
    const publica = await request(server()).get(`/service_orders/public/${aw.publicToken}`).expect(200);
    expect(publica.body.client.name).toBe(aw.clientName);
    const ficha = await request(server()).get(`/service_orders/${aw.orderId}/office-sheet`).set(auth()).expect(200);
    expect(ficha.body.client.name).toBe(aw.clientName);
  });

  it('sem client_id, a OS herda o dono do carro', async () => {
    const res = await request(server())
      .post('/service_orders')
      .set(auth())
      .send({ car_id: aw.carId, client_complaint: 'outra visita' })
      .expect(201);
    const os = await request(server()).get(`/service_orders/${res.body.service_order_id}`).set(auth()).expect(200);
    expect(os.body.client.client_id).toBe(aw.clientId);
  });

  it('carro sem dono ganha o dono informado na OS', async () => {
    const y = await newClient('Dono Novo');
    const { carId } = await openOrderAs(app, a.token);
    await request(server())
      .post('/service_orders')
      .set(auth())
      .send({ car_id: carId, client_id: y, client_complaint: 'teste' })
      .expect(201);
    const car = await request(server()).get(`/cars/${carId}`).set(auth()).expect(200);
    expect(car.body.client_id).toBe(y);
  });

  it('cliente de outra oficina: 403 e nenhuma OS criada', async () => {
    const before = (await request(server()).get('/service_orders/orders?status=all').set(auth()).expect(200)).body.length;
    await request(server())
      .post('/service_orders')
      .set(auth())
      .send({ car_id: aw.carId, client_id: bw.clientId, client_complaint: 'invasão' })
      .expect(403);
    const after = (await request(server()).get('/service_orders/orders?status=all').set(auth()).expect(200)).body.length;
    expect(after).toBe(before);
  });

  it('completar dados mexe no cliente da OS, não no dono do carro', async () => {
    const y = await newClient('Quem Trouxe');
    const res = await request(server())
      .post('/service_orders')
      .set(auth())
      .send({ car_id: aw.carId, client_id: y, client_complaint: 'teste completar' })
      .expect(201);
    await request(server())
      .patch(`/service_orders/${res.body.service_order_id}/complete-data`)
      .set(auth())
      .send({ client: { phone: '+5514997009988', address: 'Rua Y, 1' } })
      .expect(200);
    const os = await request(server()).get(`/service_orders/${res.body.service_order_id}`).set(auth()).expect(200);
    expect(os.body.client.client_id).toBe(y);
    expect(os.body.client.phone).toBe('+5514997009988');
    const antiga = await request(server()).get(`/service_orders/${aw.orderId}`).set(auth()).expect(200);
    expect(antiga.body.client.phone).not.toBe('+5514997009988');
  });
});
