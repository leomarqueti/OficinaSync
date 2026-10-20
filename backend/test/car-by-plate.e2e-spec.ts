import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, type World } from './helpers/fixtures';

function plate(): string {
  const l = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const d = () => String(Math.floor(Math.random() * 10));
  return `${l()}${l()}${l()}${d()}${l()}${d()}${d()}`;
}

// Abertura de OS guiada: a primeira tela é a placa; carro já conhecido não pode virar carro repetido.
describe('GET /cars/by-plate/:plate', () => {
  let app: INestApplication;
  let a: Owner;
  let b: Owner;
  let aw: World;
  let bw: World;
  const server = () => app.getHttpServer();
  const auth = (o: Owner) => ({ Authorization: `Bearer ${o.token}` });
  const byPlate = (o: Owner, p: string) => request(server()).get(`/cars/by-plate/${encodeURIComponent(p)}`).set(auth(o));

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'bp');
    b = await createTenantWithOwner(app, 'bq');
    aw = await createWorld(app, a.token);
    bw = await createWorld(app, b.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('acha pela placa exata, com marca, modelo e dono', async () => {
    const res = await byPlate(a, aw.plate).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ car_id: aw.carId, plate: aw.plate, owner: { client_id: aw.clientId, name: aw.clientName } });
    expect(res.body[0]).toHaveProperty('brand');
    expect(res.body[0]).toHaveProperty('last_mileage');
  });

  it('placa normalizada: minúscula com hífen acha a mesma', async () => {
    const typed = `${aw.plate.slice(0, 3).toLowerCase()}-${aw.plate.slice(3).toLowerCase()} `;
    const res = await byPlate(a, typed).expect(200);
    expect(res.body.map((c: { car_id: number }) => c.car_id)).toEqual([aw.carId]);
  });

  it('último KM vem da OS mais recente do carro', async () => {
    const p = plate();
    const car = await request(server()).post('/cars').set(auth(a)).send({ plate: p, mileage_in: 40000 }).expect(201);
    await request(server()).post('/service_orders').set(auth(a)).send({ car_id: car.body.car_id, client_complaint: 'visita 1', mileage_in: 50000 }).expect(201);
    await new Promise((r) => setTimeout(r, 20));
    await request(server()).post('/service_orders').set(auth(a)).send({ car_id: car.body.car_id, client_complaint: 'visita 2', mileage_in: 55500 }).expect(201);
    const res = await byPlate(a, p).expect(200);
    expect(res.body[0].last_mileage).toBe(55500);
  });

  it('duas placas iguais na mesma oficina (dado antigo duplicado): devolve as duas', async () => {
    const p = plate();
    await request(server()).post('/cars').set(auth(a)).send({ plate: p }).expect(201);
    await request(server()).post('/cars').set(auth(a)).send({ plate: p }).expect(201);
    const res = await byPlate(a, p).expect(200);
    expect(res.body).toHaveLength(2);
  });

  it('placa de outra oficina não aparece', async () => {
    const res = await byPlate(a, bw.plate).expect(200);
    expect(res.body).toEqual([]);
  });

  it('placa que não existe: lista vazia', async () => {
    const res = await byPlate(a, plate()).expect(200);
    expect(res.body).toEqual([]);
  });
});
