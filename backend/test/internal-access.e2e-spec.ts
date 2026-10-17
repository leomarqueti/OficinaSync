import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createStaff, createTenantWithOwner, type Owner, type Staff } from './helpers/seed';
import { openOrderAs } from './helpers/fixtures';
import { Role } from '../src/modules/users/role.enum';

describe('dados internos: acesso por perfil, anotações, responsável e time', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let mech1: Staff; // abre a OS → responsável
  let mech2: Staff; // mecânico comum
  let recep: Staff;
  let orderId: number;

  const server = () => app.getHttpServer();
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'ia');
    b = await createTenantWithOwner(app, 'ib');
    mech1 = await createStaff(app, a.tenant, Role.MECHANIC, 'm1');
    mech2 = await createStaff(app, a.tenant, Role.MECHANIC, 'm2');
    recep = await createStaff(app, a.tenant, Role.RECEPTIONIST, 'rc');
    orderId = (await openOrderAs(app, mech1.token)).orderId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('o responsável (quem abriu) lê com permissões de edição e vê as anotações', async () => {
    const res = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(mech1.token)).expect(200);

    expect(res.body.viewer).toEqual({ user_id: mech1.user.user_id, role: 'mechanic', is_responsible: true });
    expect(res.body.responsible.user_id).toBe(mech1.user.user_id);
    expect(res.body.can.edit_team).toBe(true);
    expect(res.body.notes).toBeNull();
    expect(res.body.responsible_share_percent).toBe(100);
  });

  it('mecânico comum lê sem anotações e sem poder de equipe', async () => {
    const res = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(mech2.token)).expect(200);

    expect(res.body.can).toMatchObject({ edit_items: true, edit_team: false, edit_notes: false, see_sheet: false });
    expect(res.body.notes).toBeNull();
  });

  it('dono e recepção leem com tudo liberado', async () => {
    for (const t of [a.token, recep.token]) {
      const res = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(t)).expect(200);
      expect(res.body.can).toMatchObject({ edit_team: true, edit_notes: true, change_responsible: true, see_sheet: true });
    }
  });

  it('anotações: escritório e responsável gravam; mecânico comum recebe 403', async () => {
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(mech1.token)).send({ notes: 'Cliente paga no PIX' }).expect(200);
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(mech2.token)).send({ notes: 'hack' }).expect(403);

    const office = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(recep.token)).expect(200);
    expect(office.body.notes).toBe('Cliente paga no PIX');

    const common = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(mech2.token)).expect(200);
    expect(common.body.notes).toBeNull();
  });

  it('anotação vazia limpa o campo; texto longo demais é recusado', async () => {
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(a.token)).send({ notes: '   ' }).expect(200);
    const res = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(a.token)).expect(200);
    expect(res.body.notes).toBeNull();
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(a.token)).send({ notes: 'x'.repeat(4001) }).expect(400);
  });

  it('só o escritório troca o responsável', async () => {
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(mech1.token)).send({ user_id: mech2.user.user_id }).expect(403);
    const res = await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(recep.token)).send({ user_id: mech2.user.user_id }).expect(200);
    expect(res.body.responsible.user_id).toBe(mech2.user.user_id);

    const after = await request(server()).get(`/service_orders/${orderId}/internal`).set(as(mech2.token)).expect(200);
    expect(after.body.viewer.is_responsible).toBe(true);
    // volta ao estado original pros próximos testes
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(a.token)).send({ user_id: mech1.user.user_id }).expect(200);
  });

  it('responsável de outra oficina é recusado', async () => {
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(a.token)).send({ user_id: b.user.user_id }).expect(400);
  });

  it('isolamento: oficina B não lê nem altera a OS da A', async () => {
    await request(server()).get(`/service_orders/${orderId}/internal`).set(as(b.token)).expect(403);
    await request(server()).put(`/service_orders/${orderId}/internal/notes`).set(as(b.token)).send({ notes: 'x' }).expect(403);
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(b.token)).send({ user_id: b.user.user_id }).expect(403);
  });

  it('OS inexistente → 404; sem token → 401', async () => {
    await request(server()).get('/service_orders/99999999/internal').set(as(a.token)).expect(404);
    await request(server()).get(`/service_orders/${orderId}/internal`).expect(401);
  });

  it('GET /users/team lista os funcionários ativos da própria oficina (sem e-mail, sem outra oficina)', async () => {
    const res = await request(server()).get('/users/team').set(as(mech2.token)).expect(200);
    const ids = res.body.map((u: { user_id: number }) => u.user_id);
    expect(ids).toEqual(expect.arrayContaining([a.user.user_id, mech1.user.user_id, mech2.user.user_id, recep.user.user_id]));
    expect(ids).not.toContain(b.user.user_id);
    expect(res.body[0]).not.toHaveProperty('email');
    expect(res.body[0]).toHaveProperty('role');
  });

  it('GET /users/me devolve o cargo', async () => {
    const res = await request(server()).get('/users/me').set(as(recep.token)).expect(200);
    expect(res.body.role).toBe('receptionist');
  });
});
