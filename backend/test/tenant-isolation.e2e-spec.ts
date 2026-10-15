import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, PNG_1PX, type World } from './helpers/fixtures';

type Method = 'get' | 'post' | 'patch' | 'delete';
type Attack = { name: string; run: () => request.Test };

describe('isolamento entre oficinas (tenants)', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let bw: World; // dados da oficina B
  let aDeviceId: number; // dispositivo da oficina A

  const server = () => app.getHttpServer();
  const as = (owner: Owner, method: Method, path: string) =>
    request(server())[method](path).set('Authorization', `Bearer ${owner.token}`);

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'a');
    b = await createTenantWithOwner(app, 'b');
    bw = await createWorld(app, b.token);

    const aDevice = await as(a, 'post', '/obd/devices')
      .send({ name: 'Dongle A' })
      .expect(201);
    aDeviceId = aDevice.body.device_id;
  });

  afterAll(async () => {
    await app.close();
  });

  // A tenta tocar em recursos da B. Leituras primeiro, mutações destrutivas por último
  // (se a proteção falhar, o teste que falha é o sinal — e não derruba os seguintes).
  const attacks: Attack[] = [
    { name: 'GET /cars/:id', run: () => as(a, 'get', `/cars/${bw.carId}`) },
    {
      name: 'GET /service_orders/by-car/:carId',
      run: () => as(a, 'get', `/service_orders/by-car/${bw.carId}`),
    },
    {
      name: 'GET /service_orders/:id/report.pdf',
      run: () => as(a, 'get', `/service_orders/${bw.orderId}/report.pdf`),
    },
    {
      name: 'GET /tests/history',
      run: () => as(a, 'get', `/tests/history?car_id=${bw.carId}&title=teste`),
    },
    {
      name: 'GET /obd/devices/:id/latest',
      run: () => as(a, 'get', `/obd/devices/${bw.deviceId}/latest`),
    },
    {
      name: 'PATCH /cars/:id',
      run: () => as(a, 'patch', `/cars/${bw.carId}`).send({ color: 'hack' }),
    },
    {
      name: 'PATCH /clients/:id',
      run: () =>
        as(a, 'patch', `/clients/${bw.clientId}`).send({ address: 'hack' }),
    },
    {
      name: 'POST /sections na OS da B',
      run: () =>
        as(a, 'post', '/sections').send({
          service_order_id: bw.orderId,
          type: 'diagnosis',
        }),
    },
    {
      name: 'PATCH /sections/:id',
      run: () =>
        as(a, 'patch', `/sections/${bw.sectionId}`).send({ notes: 'hack' }),
    },
    {
      name: 'PATCH /sections/:id/publish',
      run: () => as(a, 'patch', `/sections/${bw.sectionId}/publish`),
    },
    {
      name: 'POST /medias na etapa da B',
      run: () =>
        as(a, 'post', '/medias')
          .field('section_id', String(bw.sectionId))
          .field('type', 'photo')
          .attach('file', PNG_1PX, {
            filename: 'a.png',
            contentType: 'image/png',
          }),
    },
    {
      name: 'POST /tests na etapa da B',
      run: () =>
        as(a, 'post', '/tests').send({
          section_id: bw.sectionId,
          title: 'hack',
        }),
    },
    {
      name: 'PATCH /tests/:id',
      run: () => as(a, 'patch', `/tests/${bw.testId}`).send({ notes: 'hack' }),
    },
    {
      name: 'POST /service_orders/:id/promo-video',
      run: () => as(a, 'post', `/service_orders/${bw.orderId}/promo-video`),
    },
    {
      name: 'POST /obd/devices/:id/command',
      run: () =>
        as(a, 'post', `/obd/devices/${bw.deviceId}/command`).send({
          command: 'read_dtc',
        }),
    },
    {
      name: 'PATCH /obd/devices/:id',
      run: () =>
        as(a, 'patch', `/obd/devices/${bw.deviceId}`).send({ name: 'hack' }),
    },
    {
      name: 'POST /obd/capture (device da B + OS da B)',
      run: () =>
        as(a, 'post', '/obd/capture').send({
          device_id: bw.deviceId,
          service_order_id: bw.orderId,
        }),
    },
    {
      name: 'POST /obd/capture (device da A + OS da B)',
      run: () =>
        as(a, 'post', '/obd/capture').send({
          device_id: aDeviceId,
          service_order_id: bw.orderId,
        }),
    },
    {
      name: 'PATCH /service_orders/:id/finish',
      run: () =>
        as(a, 'patch', `/service_orders/${bw.orderId}/finish`).send({
          conclusion: 'hack',
        }),
    },
    {
      name: 'DELETE /tests/:id',
      run: () => as(a, 'delete', `/tests/${bw.testId}`),
    },
    {
      name: 'DELETE /obd/devices/:id',
      run: () => as(a, 'delete', `/obd/devices/${bw.deviceId}`),
    },
  ];

  it.each(attacks)('A não consegue: $name (403/404)', async ({ run }) => {
    const res = await run();
    expect([403, 404]).toContain(res.status);
  });

  it('A não enxerga dados da B nas listas', async () => {
    const clients = await as(a, 'get', '/clients').expect(200);
    expect(JSON.stringify(clients.body)).not.toContain(bw.clientName);

    const cars = await as(a, 'get', '/cars').expect(200);
    expect(JSON.stringify(cars.body)).not.toContain(bw.plate);

    const orders = await as(a, 'get', '/service_orders/orders').expect(200);
    expect(JSON.stringify(orders.body)).not.toContain(bw.plate);

    const devices = await as(a, 'get', '/obd/devices').expect(200);
    expect(JSON.stringify(devices.body)).not.toContain(bw.deviceName);

    await as(a, 'get', '/invites').expect(200);
  });

  it('controle positivo: B enxerga os próprios dados (a suíte não é vazia)', async () => {
    const clients = await as(b, 'get', '/clients').expect(200);
    expect(JSON.stringify(clients.body)).toContain(bw.clientName);

    const cars = await as(b, 'get', '/cars').expect(200);
    expect(JSON.stringify(cars.body)).toContain(bw.plate);

    const devices = await as(b, 'get', '/obd/devices').expect(200);
    expect(JSON.stringify(devices.body)).toContain(bw.deviceName);

    await as(b, 'get', `/cars/${bw.carId}`).expect(200);
    await as(b, 'get', `/service_orders/by-car/${bw.carId}`).expect(200);
  });

  it('página pública não vaza CPF/e-mail do cliente nem etapa não publicada', async () => {
    const res = await request(server())
      .get(`/service_orders/public/${bw.publicToken}`)
      .expect(200);

    expect(Object.keys(res.body.client).sort()).toEqual(['name', 'phone']);
    expect(res.body.sections).toEqual([]); // checkin ainda é rascunho
    expect(JSON.stringify(res.body)).not.toContain(bw.cpf);
  });

  it.each([
    ['get', '/clients'],
    ['get', '/cars'],
    ['get', '/service_orders/orders'],
    ['get', '/service_orders/1'],
    ['get', '/obd/devices'],
    ['get', '/invites'],
    ['get', '/users/me'],
    ['post', '/medias'],
    ['post', '/tests'],
    ['post', '/sections'],
  ] as [Method, string][])('%s %s sem token → 401', async (method, path) => {
    await request(server())[method](path).expect(401);
  });
});
