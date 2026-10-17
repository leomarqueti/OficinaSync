import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createStaff, createTenantWithOwner, type Owner, type Staff } from './helpers/seed';
import { openOrderAs } from './helpers/fixtures';
import { Role } from '../src/modules/users/role.enum';

const SENTINEL = 'SEGREDO-INTERNO-7391';

describe('ficha do escritório e vazamento dos dados internos', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let mech1: Staff; // responsável
  let mech2: Staff;
  let order: { orderId: number; publicToken: string; plate: string };

  const server = () => app.getHttpServer();
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const sheet = (t: string) => request(server()).get(`/service_orders/${order.orderId}/office-sheet`).set(as(t));

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'sa');
    b = await createTenantWithOwner(app, 'sb');
    mech1 = await createStaff(app, a.tenant, Role.MECHANIC, 's1');
    mech2 = await createStaff(app, a.tenant, Role.MECHANIC, 's2');
    order = await openOrderAs(app, mech1.token);

    const base = `/service_orders/${order.orderId}`;
    await request(server()).put(`${base}/internal/notes`).set(as(a.token)).send({ notes: `${SENTINEL} nota` }).expect(200);
    await request(server()).post(`${base}/parts`).set(as(mech1.token)).send({ description: `${SENTINEL} peça`, code: 'COD-1', taken_quantity: 4, used_quantity: 2, unit_price: 25 }).expect(201);
    await request(server()).post(`${base}/parts`).set(as(mech1.token)).send({ description: 'Peça sem acerto', taken_quantity: 6 }).expect(201);
    await request(server()).post(`${base}/parts`).set(as(mech1.token)).send({ description: 'Peça sem preço', taken_quantity: 1, used_quantity: 1 }).expect(201);
    await request(server()).post(`${base}/services`).set(as(mech1.token)).send({ description: `${SENTINEL} serviço`, price: 80 }).expect(201);
    await request(server()).put(`${base}/participants`).set(as(mech1.token)).send({ participants: [{ user_id: mech2.user.user_id, share_percent: 30, task: `${SENTINEL} tarefa` }] }).expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('escritório e responsável recebem a ficha completa; mecânico comum recebe 403', async () => {
    for (const t of [a.token, mech1.token]) {
      const res = await sheet(t).expect(200);
      expect(res.body.car.plate).toBe(order.plate);
      expect(res.body.complaint).toBe('Barulho no motor');
      expect(res.body.internal_notes).toContain(SENTINEL);
    }
    await sheet(mech2.token).expect(403);
  });

  it('separa peças acertadas das retiradas sem acerto e calcula os totais', async () => {
    const res = (await sheet(a.token).expect(200)).body;

    expect(res.parts.map((p: { description: string }) => p.description)).toEqual([`${SENTINEL} peça`, 'Peça sem preço']);
    expect(res.parts[0]).toMatchObject({ code: 'COD-1', used_quantity: 2, unit_price: 25, line_total: 50 });
    expect(res.parts[1].line_total).toBeNull();
    expect(res.pending_parts.map((p: { description: string }) => p.description)).toEqual(['Peça sem acerto']);
    expect(res.totals).toEqual({ parts_total: 50, services_total: 80, grand_total: 130, unpriced_items: 1 });
  });

  it('traz equipe com a parte do responsável e os dados que faltam do cliente/carro', async () => {
    const res = (await sheet(a.token).expect(200)).body;
    expect(res.responsible).toMatchObject({ user_id: mech1.user.user_id, share_percent: 70 });
    expect(res.participants).toEqual([{ user_id: mech2.user.user_id, name: expect.any(String), share_percent: 30, task: `${SENTINEL} tarefa` }]);
    expect(res.client).toBeNull();
    expect(res.missing_data.client.length).toBeGreaterThan(0);
    expect(res.services).toEqual([{ service_id: expect.any(Number), description: `${SENTINEL} serviço`, price: 80 }]);
  });

  it('isolamento: oficina B recebe 403', async () => {
    await sheet(b.token).expect(403);
  });

  it('NENHUM dado interno vaza na página pública do cliente', async () => {
    const res = await request(server()).get(`/service_orders/public/${order.publicToken}`).expect(200);
    expect(JSON.stringify(res.body)).not.toContain(SENTINEL);
    expect(JSON.stringify(res.body)).not.toContain('COD-1');
    expect(JSON.stringify(res.body)).not.toMatch(/internal_notes|share_percent|unit_price/);
  });

  it('NENHUM dado interno vaza em GET /service_orders/:id (visão do mecânico) nem na lista', async () => {
    const one = await request(server()).get(`/service_orders/${order.orderId}`).set(as(mech2.token)).expect(200);
    expect(JSON.stringify(one.body)).not.toContain(SENTINEL);
    expect(JSON.stringify(one.body)).not.toMatch(/internal_notes|share_percent|unit_price/);

    const list = await request(server()).get('/service_orders/orders').set(as(a.token)).expect(200);
    expect(JSON.stringify(list.body)).not.toContain(SENTINEL);
  });
});
