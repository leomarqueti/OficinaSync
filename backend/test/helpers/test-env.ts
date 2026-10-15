import * as dotenv from 'dotenv';
import * as path from 'path';

// Credenciais de banco/MinIO vêm do .env de dev; só o NOME do banco e do bucket
// são trocados pra nunca tocar nos dados de desenvolvimento.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

process.env.DB_NAME = 'oficinasync_test';
process.env.MINIO_BUCKET = 'oficinasync-test';
process.env.NODE_ENV = 'test';
delete process.env.PROMO_VIDEO_ENABLED;
delete process.env.TENANT_STORAGE_QUOTA_MB;
