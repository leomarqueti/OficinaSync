import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { generateCpf } from './helpers/fixtures';

describe('e-mail do cliente é opcional', () => {
  let app: INestApplication;
  let a: Owner;

  const server = () => app.getHttpServer();
  const auth = () => ({ Authorization: `Bearer ${a.token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'email');
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /clients sem e-mail → 201 e email nulo', async () => {
    const res = await request(server())
      .post('/clients')
      .set(auth())
      .send({
        name: 'Cliente Sem Email',
        phone: '+5514997951011',
        cpf: generateCpf(),
        address: 'Rua A, 1',
      })
      .expect(201);

    expect(res.body.email).toBeNull();
  });

  it('PATCH /clients/:id com email null limpa o e-mail', async () => {
    const created = await request(server())
      .post('/clients')
      .set(auth())
      .send({
        name: 'Cliente Com Email',
        phone: '+5514997951011',
        email: 'tem@teste.local',
        cpf: generateCpf(),
        address: 'Rua B, 2',
      })
      .expect(201);
    expect(created.body.email).toBe('tem@teste.local');

    const patched = await request(server())
      .patch(`/clients/${created.body.client_id}`)
      .set(auth())
      .send({ email: null })
      .expect(200);

    expect(patched.body.email).toBeNull();
  });
});
