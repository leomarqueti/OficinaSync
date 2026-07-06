import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * DataSource usado SÓ pelo CLI do TypeORM (migration:generate / :run / :revert).
 * A aplicação em si continua configurando o TypeOrmModule no app.module.ts via
 * ConfigService — os dois leem as mesmas variáveis de ambiente, então o schema
 * bate. Aqui `synchronize` fica desligado de propósito: a partir de agora o
 * schema é versionado por migrations, não sincronizado automaticamente.
 */
export default new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});
