import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, pngOfSize, type World } from './helpers/fixtures';

const MB = 1024 * 1024;

describe('limites de upload', () => {
  let app: INestApplication;
  let a: Owner;
  let aw: World;

  const upload = (token: string, buffer: Buffer) =>
    request(app.getHttpServer())
      .post('/medias')
      .set('Authorization', `Bearer ${token}`)
      .field('section_id', String(aw.sectionId))
      .field('type', 'photo')
      .attach('file', buffer, { filename: 'a.png', contentType: 'image/png' });

  beforeAll(async () => {
    app = await createTestApp();
    a = await createTenantWithOwner(app, 'lim');
    aw = await createWorld(app, a.token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('foto pequena é aceita', async () => {
    await upload(a.token, pngOfSize(50 * 1024)).expect(201);
  });

  it('foto acima de 15 MB é recusada com 413 e mensagem em português', async () => {
    const res = await upload(a.token, pngOfSize(15 * MB + 1024)).expect(413);
    expect(res.body.message).toBe('Arquivo de foto muito grande. O limite é 15 MB.');
  });
});
