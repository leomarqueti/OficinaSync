import { randomUUID } from 'crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

/** PNG 1x1 válido. */
export const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** PNG com `totalBytes` bytes (assinatura PNG + preenchimento) — serve pra testar limites de tamanho. */
export function pngOfSize(totalBytes: number): Buffer {
  return Buffer.concat([
    PNG_1PX,
    Buffer.alloc(Math.max(0, totalBytes - PNG_1PX.length)),
  ]);
}

export function generateCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (new Set(base).size === 1) return generateCpf();

  const digit = (nums: number[]): number => {
    const factor = nums.length + 1;
    const sum = nums.reduce((acc, n, i) => acc + n * (factor - i), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = digit(base);
  const d2 = digit([...base, d1]);
  return [...base, d1, d2].join('');
}

function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digit = () => String(Math.floor(Math.random() * 10));
  return `${letter()}${letter()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}

export type World = {
  clientId: number;
  clientName: string;
  cpf: string;
  carId: number;
  plate: string;
  orderId: number;
  publicToken: string;
  sectionId: number;
  mediaId: number;
  testId: number;
  deviceId: number;
  deviceName: string;
};

/** Cria, via API e como o dono do `token`, um cliente → carro → OS → etapa checkin → foto → teste + um device OBD. */
export async function createWorld(
  app: INestApplication,
  token: string,
): Promise<World> {
  const server = app.getHttpServer();
  const auth = { Authorization: `Bearer ${token}` };

  const clientName = `Cliente ${randomUUID().slice(0, 8)}`;
  const cpf = generateCpf();
  const client = await request(server)
    .post('/clients')
    .set(auth)
    .send({
      name: clientName,
      phone: '+5514997951011',
      cpf,
      address: 'Rua Teste, 1',
    })
    .expect(201);

  const plate = randomPlate();
  const car = await request(server)
    .post('/cars')
    .set(auth)
    .send({
      plate,
      brand: 'Chevrolet',
      model: 'Celta',
      year: 2010,
      fuel_type: 'flex',
      chassis: randomUUID().replace(/-/g, '').slice(0, 17),
      color: 'Prata',
      mileage_in: 100000,
      client_id: client.body.client_id,
    })
    .expect(201);

  const order = await request(server)
    .post('/service_orders')
    .set(auth)
    .send({ car_id: car.body.car_id, client_complaint: 'Barulho no motor' })
    .expect(201);

  const section = await request(server)
    .post('/sections')
    .set(auth)
    .send({ service_order_id: order.body.service_order_id, type: 'checkin' })
    .expect(201);

  const media = await request(server)
    .post('/medias')
    .set(auth)
    .field('section_id', String(section.body.section_id))
    .field('type', 'photo')
    .attach('file', PNG_1PX, { filename: 'a.png', contentType: 'image/png' })
    .expect(201);

  const test = await request(server)
    .post('/tests')
    .set(auth)
    .send({
      section_id: section.body.section_id,
      title: 'Teste da oficina',
      verdict: 'approved',
    })
    .expect(201);

  const deviceName = `Dongle ${randomUUID().slice(0, 6)}`;
  const device = await request(server)
    .post('/obd/devices')
    .set(auth)
    .send({ name: deviceName })
    .expect(201);

  return {
    clientId: client.body.client_id,
    clientName,
    cpf,
    carId: car.body.car_id,
    plate,
    orderId: order.body.service_order_id,
    publicToken: order.body.public_token,
    sectionId: section.body.section_id,
    mediaId: media.body.media_id,
    testId: test.body.test_id,
    deviceId: device.body.device_id,
    deviceName,
  };
}

/** OS "rápida": carro só com a placa; cliente opcional só com o nome. */
export async function createPartialOrder(
  app: INestApplication,
  token: string,
  opts: { plate?: string; clientName?: string } = {},
) {
  const server = app.getHttpServer();
  const auth = { Authorization: `Bearer ${token}` };

  let clientId: number | null = null;
  if (opts.clientName) {
    const client = await request(server)
      .post('/clients')
      .set(auth)
      .send({ name: opts.clientName })
      .expect(201);
    clientId = client.body.client_id;
  }

  const plate = opts.plate ?? randomPlate();
  const car = await request(server)
    .post('/cars')
    .set(auth)
    .send({ plate, ...(clientId !== null ? { client_id: clientId } : {}) })
    .expect(201);

  const order = await request(server)
    .post('/service_orders')
    .set(auth)
    .send({ car_id: car.body.car_id, client_complaint: 'Não pega de manhã' })
    .expect(201);

  return {
    carId: car.body.car_id as number,
    clientId,
    plate,
    orderId: order.body.service_order_id as number,
    publicToken: order.body.public_token as string,
  };
}
