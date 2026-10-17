import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createStaff, createTenantWithOwner, type Owner, type Staff } from './helpers/seed';
import { createWorld, openOrderAs, pngOfSize } from './helpers/fixtures';
import { MediaService } from '../src/modules/medias/media.service';
import { Role } from '../src/modules/users/role.enum';

describe('peças e serviços da OS', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let mech1: Staff;
  let mech2: Staff;
  let orderId: number;

  const server = () => app.getHttpServer();
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const internal = (t: string) => request(server()).get(`/service_orders/${orderId}/internal`).set(as(t));
  const addPart = (t: string, body: object) => request(server()).post(`/service_orders/${orderId}/parts`).set(as(t)).send(body);

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'pa');
    b = await createTenantWithOwner(app, 'pb');
    mech1 = await createStaff(app, a.tenant, Role.MECHANIC, 'p1');
    mech2 = await createStaff(app, a.tenant, Role.MECHANIC, 'p2');
    orderId = (await openOrderAs(app, mech1.token)).orderId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('qualquer mecânico registra uma peça retirada (sem acerto, sem preço) e ela aparece na leitura', async () => {
    const res = await addPart(mech2.token, { description: 'Vela NGK', code: 'BKR6E', taken_quantity: 4 }).expect(201);
    expect(res.body).toMatchObject({ description: 'Vela NGK', code: 'BKR6E', taken_quantity: 4, used_quantity: null, unit_price: null, photo_url: null });

    const read = await internal(mech1.token).expect(200);
    expect(read.body.parts.map((p: { description: string }) => p.description)).toContain('Vela NGK');
    expect(read.body.parts[0].created_by_name).toContain('p2');
  });

  it('acerto: informa o que realmente usou e o preço; usada maior que retirada é 400', async () => {
    const part = (await addPart(mech1.token, { description: 'Filtro de óleo', taken_quantity: 2 }).expect(201)).body;

    await request(server()).patch(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).send({ used_quantity: 3 }).expect(400);

    const ok = await request(server()).patch(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).send({ used_quantity: 1, unit_price: 32.5 }).expect(200);
    expect(ok.body).toMatchObject({ used_quantity: 1, unit_price: 32.5 });
  });

  it('é possível limpar o preço (voltar a "não informado") e o acerto com null', async () => {
    const part = (await addPart(mech1.token, { description: 'Correia', taken_quantity: 1, used_quantity: 1, unit_price: 80 }).expect(201)).body;
    const res = await request(server()).patch(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).send({ unit_price: null, used_quantity: null }).expect(200);
    expect(res.body.unit_price).toBeNull();
    expect(res.body.used_quantity).toBeNull();
  });

  it('valida: descrição vazia, quantidade negativa, 3 casas decimais, preço negativo', async () => {
    await addPart(mech1.token, { description: '', taken_quantity: 1 }).expect(400);
    await addPart(mech1.token, { description: 'X', taken_quantity: -1 }).expect(400);
    await addPart(mech1.token, { description: 'X', taken_quantity: 1.234 }).expect(400);
    await addPart(mech1.token, { description: 'X', taken_quantity: 1, unit_price: -5 }).expect(400);
    await addPart(mech1.token, { taken_quantity: 1 }).expect(400);
  });

  it('campos fora da whitelist (tenant, part_id) são ignorados', async () => {
    const res = await addPart(mech1.token, { description: 'Whitelist', taken_quantity: 1, part_id: 1, tenant: { id: b.tenant.id } }).expect(201);
    expect(res.body.part_id).not.toBe(1);
  });

  it('descrição com HTML é guardada como texto (a ficha escapa na tela)', async () => {
    const res = await addPart(mech1.token, { description: '<script>alert(1)</script>', taken_quantity: 1 }).expect(201);
    expect(res.body.description).toBe('<script>alert(1)</script>');
  });

  it('apagar peça; peça de outra OS/oficina é 404/403', async () => {
    const part = (await addPart(mech1.token, { description: 'Apagar', taken_quantity: 1 }).expect(201)).body;
    await request(server()).delete(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech2.token)).expect(200);
    await request(server()).patch(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).send({ taken_quantity: 2 }).expect(404);

    const other = (await addPart(mech1.token, { description: 'Da A', taken_quantity: 1 }).expect(201)).body;
    await request(server()).patch(`/service_orders/${orderId}/parts/${other.part_id}`).set(as(b.token)).send({ taken_quantity: 9 }).expect(403);
  });

  it('serviços: criar, valor opcional, editar e apagar', async () => {
    const created = await request(server()).post(`/service_orders/${orderId}/services`).set(as(mech1.token)).send({ description: 'Troca da bomba de combustível', price: 150 }).expect(201);
    expect(created.body).toMatchObject({ description: 'Troca da bomba de combustível', price: 150 });

    const noPrice = await request(server()).post(`/service_orders/${orderId}/services`).set(as(mech1.token)).send({ description: 'Diagnóstico elétrico' }).expect(201);
    expect(noPrice.body.price).toBeNull();

    await request(server()).patch(`/service_orders/${orderId}/services/${created.body.service_id}`).set(as(mech1.token)).send({ price: 180 }).expect(200);
    await request(server()).post(`/service_orders/${orderId}/services`).set(as(mech1.token)).send({ description: 'x', price: -1 }).expect(400);

    const read = await internal(a.token).expect(200);
    expect(read.body.services.find((s: { service_id: number }) => s.service_id === created.body.service_id).price).toBe(180);

    await request(server()).delete(`/service_orders/${orderId}/services/${noPrice.body.service_id}`).set(as(mech1.token)).expect(200);
  });

  it('OS finalizada: mecânico não edita peças/serviços (403); escritório edita', async () => {
    const w = await createWorld(app, a.token); // OS completa, aberta pelo dono
    const add = (t: string) => request(server()).post(`/service_orders/${w.orderId}/parts`).set(as(t)).send({ description: 'Pós-fim', taken_quantity: 1 });

    await add(mech1.token).expect(201); // ainda aberta
    await request(server()).patch(`/service_orders/${w.orderId}/finish`).set(as(a.token)).send({ conclusion: 'ok', final_verdict: 'resolved' }).expect(200);

    await add(mech1.token).expect(403);
    await add(a.token).expect(201);
  });

describe('foto da caixa', () => {
    const photo = (t: string, partId: number, buffer: Buffer, name = 'caixa.png') =>
      request(server())
        .post(`/service_orders/${orderId}/parts/${partId}/photo`)
        .set(as(t))
        .attach('file', buffer, { filename: name, contentType: 'image/png' });

    it('anexa a foto, devolve URL assinada e a foto entra na cota da oficina', async () => {
      const part = (await addPart(mech1.token, { description: 'Caixa da bomba', taken_quantity: 1 }).expect(201)).body;
      const before = await app.get(MediaService).getTenantUsageBytes(a.tenant.id);

      const res = await photo(mech1.token, part.part_id, pngOfSize(50 * 1024)).expect(201);
      expect(res.body.photo_url).toMatch(/^https?:\/\//);

      const after = await app.get(MediaService).getTenantUsageBytes(a.tenant.id);
      expect(after - before).toBeGreaterThanOrEqual(50 * 1024);
    });

    it('arquivo que não é imagem é recusado (400)', async () => {
      const part = (await addPart(mech1.token, { description: 'Sem imagem', taken_quantity: 1 }).expect(201)).body;
      await photo(mech1.token, part.part_id, Buffer.from('isto não é uma foto'), 'x.txt').expect(400);
    });

    it('foto acima de 15 MB → 413', async () => {
      const part = (await addPart(mech1.token, { description: 'Foto gigante', taken_quantity: 1 }).expect(201)).body;
      await photo(mech1.token, part.part_id, pngOfSize(15 * 1024 * 1024 + 1024)).expect(413);
    });

    it('sem arquivo → 400; peça de outra oficina → 403', async () => {
      const part = (await addPart(mech1.token, { description: 'Sem arquivo', taken_quantity: 1 }).expect(201)).body;
      await request(server()).post(`/service_orders/${orderId}/parts/${part.part_id}/photo`).set(as(mech1.token)).expect(400);
      await photo(b.token, part.part_id, pngOfSize(1024)).expect(403);
    });

    it('trocar a foto mantém só a nova; apagar a peça não deixa erro', async () => {
      const part = (await addPart(mech1.token, { description: 'Troca de foto', taken_quantity: 1 }).expect(201)).body;
      await photo(mech1.token, part.part_id, pngOfSize(2048)).expect(201);
      await photo(mech1.token, part.part_id, pngOfSize(4096)).expect(201);
      await request(server()).delete(`/service_orders/${orderId}/parts/${part.part_id}`).set(as(mech1.token)).expect(200);
    });
  });
});
