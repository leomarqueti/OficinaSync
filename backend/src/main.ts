import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { appValidationPipe } from './common/validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Em produção rodamos atrás do proxy reverso Caddy — sem isso, o rate
  // limiting (ThrottlerGuard) enxergaria o IP do Caddy pra todo mundo,
  // e um usuário bloquearia a oficina inteira.
  app.set('trust proxy', 1);
  app.disable('x-powered-by'); // não anuncia que é Express

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:8081'];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(appValidationPipe());
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
