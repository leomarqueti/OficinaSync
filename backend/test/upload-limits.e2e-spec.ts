import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createTenantWithOwner, type Owner } from './helpers/seed';
import { createWorld, pngOfSize, type World } from './helpers/fixtures';
import { DataSource } from 'typeorm';
import { MediaService } from '../src/modules/medias/media.service';
import { Media } from '../src/modules/medias/media.entity';
import { Sections } from '../src/modules/sections/section.entity';

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
  async function insertFakeMedia(sectionId: number, size: number) {
    const ds = app.get(DataSource);
    const section = await ds
      .getRepository(Sections)
      .findOneByOrFail({ section_id: sectionId });
    await ds.getRepository(Media).save(
      ds.getRepository(Media).create({
        type: 'photo',
        bucket: 'oficinasync-test',
        object_name: `fake/${Math.random()}`,
        mime_type: 'image/png',
        size,
        label: null,
        section,
      }),
    );
  }

  it('consumo soma bytes acima de 2 GB sem estourar int32', async () => {
    const owner = await createTenantWithOwner(app, 'big');
    const world = await createWorld(app, owner.token);
    await insertFakeMedia(world.sectionId, 2_000_000_000);
    await insertFakeMedia(world.sectionId, 2_000_000_000);

    const used = await app
      .get(MediaService)
      .getTenantUsageBytes(owner.tenant.id);

    expect(used).toBeGreaterThanOrEqual(4_000_000_000);
  });

  it('cota: upload que passa da cota é recusado (413); fechar a cota é aceito; outra oficina não é afetada', async () => {
    const full = await createTenantWithOwner(app, 'cota1');
    const fullWorld = await createWorld(app, full.token);
    const other = await createTenantWithOwner(app, 'cota2');
    const otherWorld = await createWorld(app, other.token);

    process.env.TENANT_STORAGE_QUOTA_MB = '1'; // 1 MB = 1_048_576 bytes
    try {
      // a foto semeada pelo createWorld já ocupa alguns bytes; preenche até faltar 100 KB
      const base = await app.get(MediaService).getTenantUsageBytes(full.tenant.id);
      await insertFakeMedia(fullWorld.sectionId, 1_048_576 - base - 100 * 1024);

      const send = (token: string, sectionId: number, size: number) =>
        request(app.getHttpServer())
          .post('/medias')
          .set('Authorization', `Bearer ${token}`)
          .field('section_id', String(sectionId))
          .field('type', 'photo')
          .attach('file', pngOfSize(size), {
            filename: 'a.png',
            contentType: 'image/png',
          });

      // 100 KB + 1 byte passa da cota → 413
      const over = await send(full.token, fullWorld.sectionId, 100 * 1024 + 1).expect(413);
      expect(over.body.message).toBe(
        'Limite de armazenamento da oficina atingido. Fale com o suporte para ampliar.',
      );

      // exatamente 100 KB fecha a cota → aceito
      await send(full.token, fullWorld.sectionId, 100 * 1024).expect(201);

      // a outra oficina continua livre
      await send(other.token, otherWorld.sectionId, 50 * 1024).expect(201);
    } finally {
      delete process.env.TENANT_STORAGE_QUOTA_MB;
    }
  });
});
