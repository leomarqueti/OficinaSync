import { ClassSerializerInterceptor, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as sql from 'mssql';
import { AppModule } from '../../src/app.module';
import { appValidationPipe } from '../../src/common/validation';
import { EmailService } from '../../src/modules/emailResend/emailResend.service';

const emailOff = () => Promise.reject(new Error('e-mail desligado nos testes'));

/** Provedor de e-mail dos testes: recusa todo envio imediatamente (sem rede). */
export const failingEmailService = {
  sendVerificationEmail: emailOff,
  sendPasswordResetEmail: emailOff,
  sendInviteEmail: emailOff,
};

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
  })
    // Os testes NUNCA chamam o provedor de e-mail de verdade: a resposta dele (sempre um erro, a chave
    // é falsa) chegava depois da suíte acabar e o Jest saía com código 1 no CI ("Cannot log after tests
    // are done"). O falso falha NA HORA, igual ao provedor recusando — o que o código precisa aguentar.
    .overrideProvider(EmailService)
    .useValue(failingEmailService)
    .compile();

  const app = moduleRef.createNestApplication();
  // igual ao main.ts (atrás do Caddy): o limite por IP usa o X-Forwarded-For
  (app.getHttpAdapter().getInstance() as { set: (k: string, v: unknown) => void }).set('trust proxy', 1);
  app.useGlobalPipes(appValidationPipe());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
    }),
  );
  await app.init();

  return app;
}
