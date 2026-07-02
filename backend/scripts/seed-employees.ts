import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { Users } from '../src/modules/users/users.entity';
import { Role } from '../src/modules/users/role.enum';

const OWNER_EMAIL = 'dommessi2@gmail.com';

const employees: { name: string; email: string; role: Role }[] = [
  { name: 'Mecânico 1', email: 'mecanico1@limaautoeletrica.com.br', role: Role.MECHANIC },
  { name: 'Mecânico 2', email: 'mecanico2@limaautoeletrica.com.br', role: Role.MECHANIC },
  { name: 'Mecânico 3', email: 'mecanico3@limaautoeletrica.com.br', role: Role.MECHANIC },
  { name: 'Mecânico 4', email: 'mecanico4@limaautoeletrica.com.br', role: Role.MECHANIC },
  { name: 'Sócia (escritório)', email: 'esposa@limaautoeletrica.com.br', role: Role.OWNER },
];

async function main() {
  const dataSource = new DataSource({
    type: 'mssql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [path.join(__dirname, '../src/modules/**/*.entity{.ts,.js}')],
    options: { encrypt: false, trustServerCertificate: true },
  });

  await dataSource.initialize();

  const usersRepo = dataSource.getRepository(Users);

  const owner = await usersRepo.findOne({
    where: { email: OWNER_EMAIL },
    relations: { tenant: true },
  });

  if (!owner || !owner.tenant) {
    throw new Error(`Não encontrei um tenant vinculado a ${OWNER_EMAIL}.`);
  }

  const pepperValue = process.env.PASSWORD_PEPPER;
  if (!pepperValue) {
    throw new Error('PASSWORD_PEPPER não definido no .env');
  }
  const pepper = Buffer.from(pepperValue, 'utf8');

  const results: { name: string; email: string; password: string }[] = [];
  const skipped: string[] = [];

  for (const emp of employees) {
    const existing = await usersRepo.findOne({ where: { email: emp.email } });

    if (existing) {
      skipped.push(emp.email);
      continue;
    }

    const tempPassword = randomBytes(4).toString('hex');
    const hash = await argon2.hash(tempPassword, {
      type: argon2.argon2id,
      secret: pepper,
    });

    const user = usersRepo.create({
      name: emp.name,
      email: emp.email,
      password_hash: hash,
      role: emp.role,
      is_active: true,
      tenant: owner.tenant,
    });

    await usersRepo.save(user);
    results.push({ name: emp.name, email: emp.email, password: tempPassword });
  }

  console.log('\n=== Contas criadas ===');
  for (const r of results) {
    console.log(`${r.name} | ${r.email} | senha temporária: ${r.password}`);
  }

  if (skipped.length > 0) {
    console.log('\n=== Já existiam (puladas) ===');
    skipped.forEach((email) => console.log(email));
  }

  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
