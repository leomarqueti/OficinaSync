import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';

describe('ids inexistentes', () => {
  let app: INestApplication;
  let a: Owner;

  const auth = () => ({ Authorization: `Bearer ${a.token}` });
  const MISSING = 2000000000;

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'nf');
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['get', `/cars/${MISSING}`, undefined],
    ['patch', `/cars/${MISSING}`, { color: 'x' }],
    ['patch', `/clients/${MISSING}`, { address: 'x' }],
    ['get', `/service_orders/${MISSING}`, undefined],
    ['get', `/service_orders/by-car/${MISSING}`, undefined],
    ['get', `/tests/history?car_id=${MISSING}&title=x`, undefined],
  ] as ['get' | 'patch', string, object | undefined][])(
    '%s %s → 404',
    async (method, path, body) => {
      const req = request(app.getHttpServer())[method](path).set(auth());
      const res = body ? await req.send(body) : await req;
      expect(res.status).toBe(404);
    },
  );
});
