import { CreateTenantDto } from '../modules/tenants/dto/create-tenants.dto';
import { CreateUserDto } from '../modules/users/dto/create-users.dto';
import { LoginDto } from '../modules/AuthModule/dto/login.dto';
import { appValidationPipe } from './validation';

const body = (metatype: new () => object) => ({ type: 'body' as const, metatype });

describe('appValidationPipe (anti mass-assignment)', () => {
  const pipe = appValidationPipe();

  it('remove campos que o DTO não declara (tenant, is_active, user_id) do cadastro de usuário', async () => {
    const result = await pipe.transform(
      {
        name: 'Fulano',
        email: 'fulano@teste.local',
        password: 'Teste@12345',
        tenant: { id: 1 },
        is_active: true,
        user_id: 99,
        role: 'owner',
      },
      body(CreateUserDto),
    );

    expect(result).toEqual({
      name: 'Fulano',
      email: 'fulano@teste.local',
      password: 'Teste@12345',
    });
  });

  it('remove o id injetado no cadastro de oficina', async () => {
    const result = await pipe.transform(
      { name: 'Oficina X', cnpj: '11222333000181', phone: '+5514997951011', id: 7 },
      body(CreateTenantDto),
    );

    expect(result).not.toHaveProperty('id');
  });

  it('o login não perde a senha (campo precisa ter validator pra sobreviver ao whitelist)', async () => {
    const result = await pipe.transform(
      { email: 'a@b.com', password: 'segredo' },
      body(LoginDto),
    );

    expect(result).toEqual({ email: 'a@b.com', password: 'segredo' });
  });
});
