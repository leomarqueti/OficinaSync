import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner } from './helpers/seed';
import { createWorld } from './helpers/fixtures';

describe('privacidade da página pública do cliente', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('a API pública não devolve telefone, CPF, e-mail nem endereço do cliente (a tela nem usa)', async () => {
    const owner = await createTenantWithOwner(app, 'priv');
    const w = await createWorld(app, owner.token);

    const res = await request(app.getHttpServer()).get(`/service_orders/public/${w.publicToken}`).expect(200);
    const body = JSON.stringify(res.body);

    expect(body).not.toContain('5514997951011'); // telefone do cliente do createWorld
    expect(body).not.toContain(w.cpf);
    expect(res.body.client).toEqual({ name: w.clientName });
    expect(body).not.toMatch(/"(phone|cpf|email|address)"\s*:\s*"[^"]/);
  });
});
