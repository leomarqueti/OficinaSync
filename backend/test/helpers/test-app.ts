import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as sql from 'mssql';
import { AppModule } from '../../src/app.module';

async function ensureTestDatabase(): Promise<void> {
  const pool = await new sql.ConnectionPool({
    server: process.env.DB_HOST as string,
    port: Number(process.env.DB_PORT ?? 1433),
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    database: 'master',
    options: { encrypt: false, trustServerCertificate: true },
  }).connect();

  await pool
    .request()
    .query(
      `IF DB_ID('${process.env.DB_NAME}') IS NULL CREATE DATABASE [${process.env.DB_NAME}]`,
    );
  await pool.close();
}

/** Sobe o AppModule real com os mesmos pipes/interceptors globais do main.ts. */
export async function createTestApp(): Promise<INestApplication> {
  await ensureTestDatabase();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
    }),
  );
  await app.init();

  return app;
}
