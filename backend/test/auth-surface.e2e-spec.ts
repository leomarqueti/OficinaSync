import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, type World } from './helpers/fixtures';
import { UsersService } from '../src/modules/users/users.service';
import { Users } from '../src/modules/users/users.entity';

describe('superfície de autenticação', () => {
  let app: INestApplication;
  let a: Owner;
  let aw: World;
  let jwt: JwtService;

  const server = () => app.getHttpServer();
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    jwt = app.get(JwtService, { strict: false });
    a = await createTenantWithOwner(app, 'auth');
    aw = await createWorld(app, a.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('token de onboarding NÃO vale nas rotas normais', async () => {
    const onboarding = await jwt.signAsync({
      sub: a.user.user_id,
      email: a.email,
      scope: 'onboarding',
    });

    await request(server()).get('/users/me').set(bearer(onboarding)).expect(401);
    await request(server()).get('/clients').set(bearer(onboarding)).expect(401);
    await request(server())
      .get(`/service_orders/${aw.orderId}`)
      .set(bearer(onboarding))
      .expect(401);
  });

  it('POST /tenants só aceita token de onboarding (access é recusado antes da validação)', async () => {
    await request(server())
      .post('/tenants')
      .set(bearer(a.token))
      .send({})
      .expect(401);

    const onboarding = await jwt.signAsync({
      sub: a.user.user_id,
      email: a.email,
      scope: 'onboarding',
    });

    // passou do guard: corpo vazio agora é barrado pela validação (400), não pelo token (401)
    await request(server())
      .post('/tenants')
      .set(bearer(onboarding))
      .send({})
      .expect(400);
  });

  it('token antigo SEM scope continua valendo como access (compatibilidade)', async () => {
    const legacy = await jwt.signAsync({
      sub: a.user.user_id,
      email: a.email,
    });

    await request(server()).get('/users/me').set(bearer(legacy)).expect(200);
  });

  it('POST /users (cadastro público sem throttle) não existe mais', async () => {
    await request(server())
      .post('/users')
      .send({
        name: 'Intruso',
        email: `intruso-${randomUUID().slice(0, 8)}@teste.local`,
        password: 'Teste@12345',
      })
      .expect(404);
  });

  it('usuário ativo sem oficina recebe 401/403 nas rotas de tenant — nunca 500 nem dados', async () => {
    const email = `semtenant-${randomUUID().slice(0, 8)}@teste.local`;
    const password = 'Teste@12345';
    const user = await app.get(UsersService).create({
      name: 'Sem Oficina',
      email,
      password,
    });
    user.is_active = true;
    await app.get(DataSource).getRepository(Users).save(user);

    const login = await request(server())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.access_token;

    const clients = await request(server()).get('/clients').set(bearer(token));
    expect([401, 403]).toContain(clients.status);

    const order = await request(server())
      .get(`/service_orders/${aw.orderId}`)
      .set(bearer(token));
    expect([401, 403]).toContain(order.status);
  });
});
