/**
 * Cria uma oficina + dono no banco de TESTE e imprime as credenciais em JSON (uma linha).
 * Usado pelo globalSetup dos testes de tela (ui-tests/). Rodar com:
 *   cd backend && npx ts-node -r tsconfig-paths/register test/ui-seed.ts
 */
import './helpers/test-env';
import { NestFactory } from '@nestjs/core';
import * as sql from 'mssql';
import { AppModule } from '../src/app.module';
import { createOwnerRecords } from './helpers/seed';

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

async function main() {
  await ensureTestDatabase();

  // logger desligado: a única saída em stdout precisa ser o JSON
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const owner = await createOwnerRecords(app, 'ui');
  await app.close();

  process.stdout.write(
    `UI_SEED ${JSON.stringify({
      email: owner.email,
      password: owner.password,
      tenantName: owner.tenant.name,
    })}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
