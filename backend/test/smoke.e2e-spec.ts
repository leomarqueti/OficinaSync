import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner } from './helpers/seed';

describe('smoke do harness e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde 200', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('dono semeado consegue logar e /users/me devolve a oficina dele', async () => {
    const owner = await createTenantWithOwner(app, 'smoke');

    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(me.body.tenant_name).toBe(owner.tenant.name);
  });
});
