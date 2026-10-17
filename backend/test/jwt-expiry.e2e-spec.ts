import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner } from './helpers/seed';

// JWT_EXPIRES_IN existia no .env mas nunca era lido: o login emitia token sem validade.
process.env.JWT_EXPIRES_IN = '2h';

const payloadOf = (token: string) =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as {
    iat: number;
    exp?: number;
    scope: string;
  };

describe('validade do token de login', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('o access_token expira (exp = iat + JWT_EXPIRES_IN)', async () => {
    const owner = await createTenantWithOwner(app, 'exp');
    const p = payloadOf(owner.token);

    expect(p.scope).toBe('access');
    expect(p.exp).toBeDefined();
    expect((p.exp as number) - p.iat).toBe(2 * 3600);
  });

  it('o token de onboarding continua curto (15 min)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Onboarding Teste',
        email: `onb-${Date.now()}@teste.local`,
        password: 'Teste@12345',
      })
      .expect(201);

    const p = payloadOf(res.body.onboarding_token);
    expect(p.scope).toBe('onboarding');
    expect((p.exp as number) - p.iat).toBe(900);
  });
});
