import { JwtService } from '@nestjs/jwt';
import { Role } from '../../src/modules/users/role.enum';
import { randomUUID } from 'crypto';
import type { INestApplication, INestApplicationContext } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Tenants } from '../../src/modules/tenants/tenants.entity';
import { Plan } from '../../src/modules/tenants/plan.enum';
import { Status } from '../../src/modules/tenants/status.enum';
import { Users } from '../../src/modules/users/users.entity';
import { UsersService } from '../../src/modules/users/users.service';

export type Owner = {
  tenant: Tenants;
  user: Users;
  email: string;
  password: string;
  token: string;
};

function randomCnpjLike(): string {
  return String(Math.floor(Math.random() * 1e14)).padStart(14, '0');
}

export type OwnerRecords = Omit<Owner, 'token'>;

/** Cria oficina + dono ativo direto no banco (sem e-mail, sem HTTP). Serve também a scripts fora do Jest. */
export async function createOwnerRecords(
  app: INestApplicationContext,
  label: string,
): Promise<OwnerRecords> {
  const ds = app.get(DataSource);
  const tenantRepo = ds.getRepository(Tenants);
  const userRepo = ds.getRepository(Users);

  const tenant = await tenantRepo.save(
    tenantRepo.create({
      name: `Oficina ${label} ${randomUUID().slice(0, 6)}`,
      cnpj: randomCnpjLike(),
      phone: '+5514997951011',
      plan: Plan.FULL,
      status: Status.ACTIVE,
    }),
  );

  const email = `${label}-${randomUUID().slice(0, 8)}@teste.local`;
  const password = 'Teste@12345';

  const user = await app.get(UsersService).create({
    name: `Dono ${label}`,
    email,
    password,
  });
  user.tenant = tenant;
  user.is_active = true;
  await userRepo.save(user);

  return { tenant, user, email, password };
}

/** Cria oficina + dono ativo e faz login de verdade pra pegar o JWT. */
export async function createTenantWithOwner(
  app: INestApplication,
  label: string,
): Promise<Owner> {
  const { tenant, user, email, password } = await createOwnerRecords(app, label);

  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return { tenant, user, email, password, token: login.body.access_token };
}

export type Staff = { user: Users; email: string; token: string; role: Role };

/**
 * Funcionário ativo da oficina `tenant`, já com JWT. Assina o token direto (sem /auth/login)
 * porque o login tem limite de 5/min e as suítes precisam de vários perfis.
 */
export async function createStaff(
  app: INestApplication,
  tenant: Tenants,
  role: Role,
  label: string,
): Promise<Staff> {
  const email = `${label}-${randomUUID().slice(0, 8)}@teste.local`;
  const user = await app
    .get(UsersService)
    .createFromInvite(`${label} ${role}`, email, 'Teste@12345', tenant, role);
  const token = app
    .get(JwtService, { strict: false })
    .sign({ sub: user.user_id, scope: 'access' });
  return { user, email, token, role };
}
