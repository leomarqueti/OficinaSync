import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/test-app';
import { createStaff, createTenantWithOwner, type Owner, type Staff } from './helpers/seed';
import { Role } from '../src/modules/users/role.enum';

// Funcionário sem e-mail: convite por celular (WhatsApp/QR) + PIN (spec 2026-10-21-funcionario-sem-email).
describe('funcionário sem e-mail (celular + PIN)', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let mech: Staff;
  let ip = 1;

  const server = () => app.getHttpServer();
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  // cada chamada de login/aceite vem de um "IP" diferente: o limite por IP (5/min) é testado à parte
  const fresh = () => ({ 'X-Forwarded-For': `10.0.${Math.floor(ip / 250)}.${(ip++ % 250) + 1}` });
  const phone = () => `+55149${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
  const tokenOf = (link: string) => new URL(link).searchParams.get('token') as string;

  const invite = (t: string, body: object) => request(server()).post('/invites').set(as(t)).send(body);
  const accept = (body: object) => request(server()).post('/invites/accept').set(fresh()).send(body);
  const pinLogin = (body: object, headers: object = fresh()) =>
    request(server()).post('/auth/pin-login').set(headers).send(body);

  /** Convida por celular e aceita com o PIN; devolve o token de acesso e o user_id. */
  async function hire(owner: Owner, name: string, ph: string, pin = '482915') {
    const inv = await invite(owner.token, { name, phone: ph, role: 'mechanic' }).expect(201);
    const acc = await accept({ token: tokenOf(inv.body.link), pin }).expect(201);
    const me = await request(server()).get('/users/me').set(as(acc.body.access_token)).expect(200);
    return { token: acc.body.access_token as string, userId: me.body.user_id as number };
  }

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'pa');
    b = await createTenantWithOwner(app, 'pb');
    mech = await createStaff(app, a.tenant, Role.MECHANIC, 'pm');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('convite por celular', () => {
    it('o dono convida o Toninho pelo celular: link de uso único + QR, PIN fraco recusado', async () => {
      const ph = phone();
      const inv = await invite(a.token, { name: 'Toninho', phone: ph, role: 'mechanic' }).expect(201);
      expect(inv.body.link).toContain('/convite?token=');
      expect(inv.body.qr_data_url).toMatch(/^data:image\/png;base64,/);

      const token = tokenOf(inv.body.link);
      const preview = await request(server()).get(`/invites/${token}`).expect(200);
      expect(preview.body).toMatchObject({ kind: 'phone', name: 'Toninho', role: 'mechanic', tenant_name: a.tenant.name });

      const weak = await accept({ token, pin: '123456' }).expect(400);
      expect(weak.body.message).toMatch(/PIN fácil demais/);

      const ok = await accept({ token, pin: '482915' }).expect(201);
      const me = await request(server()).get('/users/me').set(as(ok.body.access_token)).expect(200);
      expect(me.body.name).toBe('Toninho');
      expect(me.body.email ?? null).toBeNull();

      await accept({ token, pin: '482915' }).expect(401); // uso único
    });

    it('mecânico não convida; celular repetido dá 409 sem dizer de quem é', async () => {
      await invite(mech.token, { name: 'X', phone: phone(), role: 'mechanic' }).expect(403);
      const ph = phone();
      await hire(a, 'Zé', ph);
      const dup = await invite(a.token, { name: 'Outro', phone: ph, role: 'mechanic' }).expect(409);
      expect(dup.body.message).toBe('Esse celular já está cadastrado.');
      const dupOther = await invite(b.token, { name: 'Outro', phone: ph, role: 'mechanic' }).expect(409);
      expect(dupOther.body.message).toBe('Esse celular já está cadastrado.');
    });

    it('dois funcionários sem e-mail convivem (índice único filtrado)', async () => {
      await hire(a, 'Sem email 1', phone());
      await hire(a, 'Sem email 2', phone());
    });

    it('convite por celular exige nome; convite sem e-mail nem celular é recusado', async () => {
      await invite(a.token, { phone: phone(), role: 'mechanic' }).expect(400);
      await invite(a.token, { role: 'mechanic' }).expect(400);
    });

    it('convite por e-mail: mesmo se o e-mail não sair, o convite é criado e aceita com senha (regressão: dava 500)', async () => {
      const inv = await invite(a.token, { email: `antigo-${Date.now()}@teste.local`, role: 'mechanic' }).expect(201);
      expect(inv.body.link).toContain('/convite?token=');
      expect(typeof inv.body.email_sent).toBe('boolean');
      const token = tokenOf(inv.body.link);
      expect((await request(server()).get(`/invites/${token}`).expect(200)).body.kind).toBe('email');
      await accept({ token, name: 'Com Email', password: 'Teste@12345' }).expect(201);
    });
  });

  describe('novo acesso (esqueceu o PIN)', () => {
    it('o link novo invalida o anterior e troca o PIN', async () => {
      const ph = phone();
      const t = await hire(a, 'Toninho2', ph);
      const l1 = await request(server()).post('/invites/access-link').set(as(a.token)).send({ user_id: t.userId }).expect(201);
      const l2 = await request(server()).post('/invites/access-link').set(as(a.token)).send({ user_id: t.userId }).expect(201);
      await accept({ token: tokenOf(l1.body.link), pin: '907364' }).expect(401);
      await accept({ token: tokenOf(l2.body.link), pin: '907364' }).expect(201);
      await pinLogin({ phone: ph, pin: '907364' }).expect(201);
      await pinLogin({ phone: ph, pin: '482915' }).expect(401); // o PIN antigo morreu
    });

    it('dono de outra oficina não gera acesso; usuário sem celular dá 400; mecânico não gera', async () => {
      const t = await hire(a, 'Toninho3', phone());
      await request(server()).post('/invites/access-link').set(as(b.token)).send({ user_id: t.userId }).expect(403);
      await request(server()).post('/invites/access-link').set(as(a.token)).send({ user_id: mech.user.user_id }).expect(400);
      await request(server()).post('/invites/access-link').set(as(mech.token)).send({ user_id: t.userId }).expect(403);
    });
  });

  describe('entrar com celular + PIN', () => {
    it('PIN certo entra; celular inexistente e PIN errado têm a mesma mensagem', async () => {
      const ph = phone();
      await hire(a, 'Login', ph);
      await pinLogin({ phone: ph, pin: '482915' }).expect(201);
      const wrong = await pinLogin({ phone: ph, pin: '907364' }).expect(401);
      const ghost = await pinLogin({ phone: phone(), pin: '482915' }).expect(401);
      expect(wrong.body.message).toBe('Celular ou PIN inválidos.');
      expect(ghost.body.message).toBe('Celular ou PIN inválidos.');
    });

    it('5 PINs errados travam por 15 min (até o PIN certo é recusado); depois volta a entrar', async () => {
      const ph = phone();
      await hire(a, 'Trava', ph);
      for (let i = 0; i < 5; i++) await pinLogin({ phone: ph, pin: '907364' }).expect(401);
      const locked = await pinLogin({ phone: ph, pin: '482915' }).expect(401);
      expect(locked.body.message).toMatch(/Muitas tentativas/);

      await app.get(DataSource).query(
        `UPDATE users SET pin_locked_until = DATEADD(minute, -16, pin_locked_until) WHERE phone = @0`,
        [ph],
      );
      await pinLogin({ phone: ph, pin: '482915' }).expect(201);
      const [row] = await app.get(DataSource).query(`SELECT failed_pin_attempts FROM users WHERE phone = @0`, [ph]);
      expect(row.failed_pin_attempts).toBe(0);
    });

    it('tentativas em paralelo não furam a trava (regressão da revisão de segurança: corrida no contador)', async () => {
      const ph = phone();
      await hire(a, 'Paralelo', ph);
      const wrongs = await Promise.all(Array.from({ length: 20 }, () => pinLogin({ phone: ph, pin: '907364' })));
      expect(wrongs.every((r) => r.status === 401)).toBe(true);
      const after = await pinLogin({ phone: ph, pin: '482915' }).expect(401);
      expect(after.body.message).toMatch(/Muitas tentativas/);
    });

    it('o mesmo celular com outra formatação é o mesmo número (convite e login)', async () => {
      const digits = `149${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
      const pretty = `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
      await hire(a, 'Formatado', pretty);
      const dup = await invite(a.token, { name: 'Dup', phone: `+55${digits}`, role: 'mechanic' }).expect(409);
      expect(dup.body.message).toBe('Esse celular já está cadastrado.');
      await pinLogin({ phone: `+55${digits}`, pin: '482915' }).expect(201);
      await pinLogin({ phone: pretty, pin: '482915' }).expect(201);
    });

    it('o login por PIN tem limite por IP', async () => {
      const ph = phone();
      await hire(a, 'Limite', ph);
      const same = { 'X-Forwarded-For': '10.9.9.9' };
      const codes: number[] = [];
      for (let i = 0; i < 6; i++) codes.push((await pinLogin({ phone: ph, pin: '482915' }, same)).status);
      expect(codes.at(-1)).toBe(429);
    });

    it('login por e-mail de quem só tem PIN dá o erro normal (sem 500)', async () => {
      const ph = phone();
      const t = await hire(a, 'SoPin', ph);
      await app.get(DataSource).query(`UPDATE users SET email = @0 WHERE user_id = @1`, [`sopin-${t.userId}@teste.local`, t.userId]);
      const res = await request(server())
        .post('/auth/login')
        .set(fresh())
        .send({ email: `sopin-${t.userId}@teste.local`, password: 'Qualquer@123' })
        .expect(401);
      expect(res.body.message).toBe('Usuario ou senha invalidos!');
    });
  });

  describe('desativar funcionário', () => {
    it('o dono lista os funcionários com celular; mecânico não lista', async () => {
      const ph = phone();
      await hire(a, 'Listado', ph);
      const list = await request(server()).get('/users/members').set(as(a.token)).expect(200);
      expect(list.body.find((m: { phone: string }) => m.phone === ph)).toMatchObject({ name: 'Listado', role: 'mechanic', is_active: true });
      await request(server()).get('/users/members').set(as(mech.token)).expect(403);
    });

    it('desativar corta até o token já emitido; reativar devolve; novo acesso pra desativado é recusado', async () => {
      const ph = phone();
      const t = await hire(a, 'Saiu', ph);
      await request(server()).patch(`/users/${t.userId}/active`).set(as(a.token)).send({ active: false }).expect(200);
      const cut = await request(server()).get('/users/me').set(as(t.token)).expect(401);
      expect(cut.body.message).toBe('Acesso desativado.');
      await pinLogin({ phone: ph, pin: '482915' }).expect(401);
      await request(server()).post('/invites/access-link').set(as(a.token)).send({ user_id: t.userId }).expect(400);

      await request(server()).patch(`/users/${t.userId}/active`).set(as(a.token)).send({ active: true }).expect(200);
      await request(server()).get('/users/me').set(as(t.token)).expect(200);
    });

    it('o dono não se desativa; outra oficina não desativa; mecânico não desativa', async () => {
      const t = await hire(a, 'Protegido', phone());
      await request(server()).patch(`/users/${a.user.user_id}/active`).set(as(a.token)).send({ active: false }).expect(400);
      await request(server()).patch(`/users/${t.userId}/active`).set(as(b.token)).send({ active: false }).expect(403);
      await request(server()).patch(`/users/${t.userId}/active`).set(as(mech.token)).send({ active: false }).expect(403);
    });

    it('criar a oficina com o e-mail falhando não deixa erro solto (regressão: derrubava o processo / a suíte seguinte)', async () => {
      const loose: unknown[] = [];
      const catcher = (reason: unknown) => loose.push(reason);
      process.on('unhandledRejection', catcher);
      try {
        const reg = await request(server())
          .post('/auth/register')
          .set(fresh())
          .send({ name: 'Dono Sem Email', email: `sem-email-${Date.now()}@teste.local`, password: 'Teste@12345' })
          .expect(201);
        await request(server())
          .post('/tenants')
          .set(as(reg.body.onboarding_token))
          .send({ name: 'Oficina Email Falha', cnpj: '11444777000161', phone: '+5514997951011' });
        await new Promise((r) => setTimeout(r, 3000)); // dá tempo do envio (que falha) terminar
        expect(loose).toEqual([]);
      } finally {
        process.off('unhandledRejection', catcher);
      }
    });

    it('o token de onboarding (dono se cadastrando, ainda inativo) continua criando a oficina', async () => {
      const email = `novo-dono-${Date.now()}@teste.local`;
      const reg = await request(server())
        .post('/auth/register')
        .set(fresh())
        .send({ name: 'Novo Dono', email, password: 'Teste@12345' })
        .expect(201);
      await request(server())
        .post('/tenants')
        .set(as(reg.body.onboarding_token))
        .send({ name: 'Oficina Nova', cnpj: '11222333000181', phone: '+5514997951011' })
        .expect((res) => expect(res.status).not.toBe(401));
    });
  });
});
