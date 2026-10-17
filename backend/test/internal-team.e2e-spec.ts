import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers/test-app';
import { createStaff, createTenantWithOwner, type Owner, type Staff } from './helpers/seed';
import { createWorld, openOrderAs } from './helpers/fixtures';
import { Role } from '../src/modules/users/role.enum';
import { Users } from '../src/modules/users/users.entity';

describe('equipe da OS (porcentagens) e comissões', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let mech1: Staff; // responsável
  let mech2: Staff;
  let mech3: Staff;
  let orderId: number;

  const server = () => app.getHttpServer();
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const put = (t: string, participants: object[], id = orderId) =>
    request(server()).put(`/service_orders/${id}/participants`).set(as(t)).send({ participants });
  const internal = (t: string, id = orderId) => request(server()).get(`/service_orders/${id}/internal`).set(as(t));

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'ta');
    b = await createTenantWithOwner(app, 'tb');
    mech1 = await createStaff(app, a.tenant, Role.MECHANIC, 't1');
    mech2 = await createStaff(app, a.tenant, Role.MECHANIC, 't2');
    mech3 = await createStaff(app, a.tenant, Role.MECHANIC, 't3');
    orderId = (await openOrderAs(app, mech1.token)).orderId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('o responsável marca quem ajudou, com o quê e quanto; ele fica com o resto', async () => {
    const res = await put(mech1.token, [
      { user_id: mech2.user.user_id, share_percent: 30, task: 'diagnóstico' },
      { user_id: mech3.user.user_id, share_percent: 10, task: 'montagem' },
    ]).expect(200);

    expect(res.body.responsible_share_percent).toBe(60);
    expect(res.body.participants).toHaveLength(2);
  });

  it('o escritório lê todas as linhas; o responsável também', async () => {
    for (const t of [a.token, mech1.token]) {
      const read = await internal(t).expect(200);
      expect(read.body.participants).toHaveLength(2);
      expect(read.body.responsible_share_percent).toBe(60);
    }
  });

  it('mecânico comum recebe SÓ a própria linha (colega e total não vazam)', async () => {
    const read = await internal(mech2.token).expect(200);
    expect(read.body.participants).toEqual([
      { user_id: mech2.user.user_id, name: expect.any(String), share_percent: 30, task: 'diagnóstico' },
    ]);
    expect(read.body.my_share_percent).toBe(30);
    expect(read.body.responsible_share_percent).toBeNull();
    expect(JSON.stringify(read.body)).not.toContain('montagem');
  });

  it('mecânico comum não edita a equipe (403)', async () => {
    await put(mech2.token, [{ user_id: mech3.user.user_id, share_percent: 50, task: 'x' }]).expect(403);
  });

  it('substitui a lista inteira; lista vazia zera a equipe', async () => {
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 50, task: 'elétrica' }]).expect(200);
    expect((await internal(a.token).expect(200)).body.participants).toHaveLength(1);
    await put(mech1.token, []).expect(200);
    const read = await internal(a.token).expect(200);
    expect(read.body.participants).toEqual([]);
    expect(read.body.responsible_share_percent).toBe(100);
  });

  it('recusa soma acima de 99%, % fora de 1–99, duplicado, tarefa vazia e o próprio responsável', async () => {
    await put(mech1.token, [
      { user_id: mech2.user.user_id, share_percent: 60, task: 'a' },
      { user_id: mech3.user.user_id, share_percent: 40, task: 'b' },
    ]).expect(400);
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 0, task: 'a' }]).expect(400);
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 100, task: 'a' }]).expect(400);
    await put(mech1.token, [
      { user_id: mech2.user.user_id, share_percent: 10, task: 'a' },
      { user_id: mech2.user.user_id, share_percent: 10, task: 'b' },
    ]).expect(400);
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 10, task: '' }]).expect(400);
    await put(mech1.token, [{ user_id: mech1.user.user_id, share_percent: 10, task: 'eu' }]).expect(400);
    expect((await internal(a.token).expect(200)).body.participants).toEqual([]); // nada foi gravado
  });

  it('recusa usuário de outra oficina e usuário inativo', async () => {
    await put(mech1.token, [{ user_id: b.user.user_id, share_percent: 10, task: 'x' }]).expect(400);

    const inactive = await createStaff(app, a.tenant, Role.MECHANIC, 'off');
    await app.get(DataSource).getRepository(Users).update(inactive.user.user_id, { is_active: false });
    await put(mech1.token, [{ user_id: inactive.user.user_id, share_percent: 10, task: 'x' }]).expect(400);
  });

  it('trocar o responsável para quem era ajudador tira a pessoa da lista de ajudantes', async () => {
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 20, task: 'a' }]).expect(200);
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(a.token)).send({ user_id: mech2.user.user_id }).expect(200);

    const read = await internal(a.token).expect(200);
    expect(read.body.participants.map((p: { user_id: number }) => p.user_id)).not.toContain(mech2.user.user_id);
    await request(server()).patch(`/service_orders/${orderId}/responsible`).set(as(a.token)).send({ user_id: mech1.user.user_id }).expect(200);
  });

  it('isolamento: oficina B não grava equipe na OS da A', async () => {
    await put(b.token, [], orderId).expect(403);
  });

  it('OS finalizada: responsável não edita a equipe (403); escritório edita', async () => {
    const w = await createWorld(app, a.token);
    await request(server()).patch(`/service_orders/${w.orderId}/responsible`).set(as(a.token)).send({ user_id: mech1.user.user_id }).expect(200);
    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 25, task: 'antes' }], w.orderId).expect(200);

    await request(server()).patch(`/service_orders/${w.orderId}/finish`).set(as(a.token)).send({ conclusion: 'ok', final_verdict: 'resolved' }).expect(200);

    await put(mech1.token, [{ user_id: mech2.user.user_id, share_percent: 40, task: 'depois' }], w.orderId).expect(403);
    await put(a.token, [{ user_id: mech2.user.user_id, share_percent: 40, task: 'ajuste do escritório' }], w.orderId).expect(200);
  });

  describe('GET /commissions', () => {
    // ontem..amanhã: não depende do fuso nem da hora em que o teste roda
    const range = () => {
      const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
      return `from=${day(-1)}&to=${day(1)}`;
    };

    it('escritório vê todos; conta só OS concluídas; responsável fica com o resto', async () => {
      const res = await request(server()).get(`/commissions?${range()}`).set(as(a.token)).expect(200);
      const byId = new Map<number, any>(res.body.people.map((p: { user_id: number }) => [p.user_id, p]));

      // OS do "pós-finalização": mech2 40%, mech1 (responsável) 60%
      expect(byId.get(mech2.user.user_id).total_percent).toBe(40);
      expect(byId.get(mech1.user.user_id).total_percent).toBe(60);
      expect(byId.get(mech1.user.user_id).orders[0].is_responsible).toBe(true);
      // a OS de teste do começo (ainda aberta) não conta
      expect(byId.get(mech1.user.user_id).os_count).toBe(1);
    });

    it('mecânico recebe só o próprio total, mesmo pedindo outro user_id', async () => {
      const res = await request(server()).get(`/commissions?${range()}&user_id=${mech1.user.user_id}`).set(as(mech2.token)).expect(200);
      expect(res.body.people).toHaveLength(1);
      expect(res.body.people[0].user_id).toBe(mech2.user.user_id);
    });

    it('filtro por funcionário (escritório) e período sem OS', async () => {
      const one = await request(server()).get(`/commissions?${range()}&user_id=${mech2.user.user_id}`).set(as(a.token)).expect(200);
      expect(one.body.people).toHaveLength(1);

      const none = await request(server()).get('/commissions?from=2020-01-01&to=2020-01-02').set(as(a.token)).expect(200);
      expect(none.body.people).toEqual([]);
    });

    it('isolamento: oficina B não vê a equipe da A; datas inválidas → 400', async () => {
      const res = await request(server()).get(`/commissions?${range()}`).set(as(b.token)).expect(200);
      expect(res.body.people).toEqual([]);
      await request(server()).get('/commissions?from=ontem').set(as(a.token)).expect(400);
    });
  });
});
