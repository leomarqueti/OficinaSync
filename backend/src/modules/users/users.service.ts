/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './users.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-users.dto';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { Tenants } from '../tenants/tenants.entity';
import { Role } from './role.enum';
import { normalizePhone } from './pin-policy';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private usersRepository: Repository<Users>,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<Users> {
    const newUser = this.usersRepository.create(createUserDto);
    const PEPPER = this.configService.get<string>('PASSWORD_PEPPER');

    if (!PEPPER) {
      throw new InternalServerErrorException(
        'PASSWORD_PEPPER não foi definido no .env',
      );
    }

    const checkUserExistence = await this.usersRepository.findOne({
      where: {
        email: createUserDto.email,
      },
    });

    if (checkUserExistence) {
      throw new ConflictException('Email já cadastrado!');
    }

    const senhaHash = await argon2.hash(createUserDto.password, {
      type: argon2.argon2id,
      secret: Buffer.from(PEPPER, 'utf8'),
    });

    newUser.password_hash = senhaHash;

    return this.usersRepository.save(newUser);
  }

  // criação a partir de um convite aceito: já vem com tenant, cargo definido e ativo direto
  // (o link do convite já foi enviado pro email, então chegar até aqui já prova posse da caixa de entrada)
  async createFromInvite(
    name: string,
    email: string,
    password: string,
    tenant: Tenants,
    role: Role,
  ): Promise<Users> {
    const PEPPER = this.configService.get<string>('PASSWORD_PEPPER');

    if (!PEPPER) {
      throw new InternalServerErrorException(
        'PASSWORD_PEPPER não foi definido no .env',
      );
    }

    const checkUserExistence = await this.usersRepository.findOne({
      where: { email },
    });

    if (checkUserExistence) {
      throw new ConflictException('Email já cadastrado!');
    }

    const senhaHash = await argon2.hash(password, {
      type: argon2.argon2id,
      secret: Buffer.from(PEPPER, 'utf8'),
    });

    const newUser = this.usersRepository.create({
      name,
      email,
      password_hash: senhaHash,
      tenant,
      role,
      is_active: true,
    });

    return this.usersRepository.save(newUser);
  }

  async updateTenantId(userId: number, tenant: Tenants) {
    const user = await this.findById(userId);

    if (!user) {
      throw new Error('Usuario nao encontrado!');
    }

    user.tenant = tenant;

    await this.usersRepository.save(user);
  }

  async findByEmail(email: string) {
    const emailUser = await this.usersRepository.findOne({
      where: {
        email: email,
      },
    });

    return emailUser;
  }

  // função responsavel por buscar a hash do usuario
  async findHashPassword(email: string) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.email = :email', { email })
      .getOne();

    const hashUser = user?.password_hash;

    if (!hashUser) {
      // mesma mensagem do login: não revela se o e-mail existe nem se a conta só tem PIN
      throw new UnauthorizedException('Usuario ou senha invalidos!');
    }

    return user;
  }

  // Usamos essa funçao para validar senhas no login
  async verifyHash(password: string, hash: string) {
    // aqui fica o pepper , os dados dele ficam no .env
    const PEPPER = this.configService.get<string>('PASSWORD_PEPPER');

    if (!PEPPER) {
      throw new InternalServerErrorException(
        'PASSWORD_PEPPER não foi definido no .env',
      );
    }

    //aqui usamos a verificaçao do proprio argon dois, que pega a senha e ja transforma em hash
    //e verifica com a do banco
    return await argon2.verify(hash, password, {
      secret: Buffer.from(PEPPER, 'utf8'),
    });
  }

  async findById(id: number) {
    const user = await this.usersRepository.findOne({
      where: {
        user_id: id,
      },
      relations: {
        tenant: true,
      },
    });

    if (!user) {
      throw new Error('Usuario nao encontrado!');
    }

    return user;
  }

  async activeUser(id: number) {
    const user = await this.findById(id);

    user.is_active = true;

    await this.usersRepository.save(user);
  }

  // usada na troca de senha logada, pra verificar a senha atual antes de trocar
  async findHashPasswordById(id: number) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.user_id = :id', { id })
      .getOne();

    if (!user?.password_hash) {
      throw new UnauthorizedException('Usuario nao encontrado!');
    }

    return user;
  }

  async updatePassword(userId: number, plainPassword: string) {
    const PEPPER = this.configService.get<string>('PASSWORD_PEPPER');

    if (!PEPPER) {
      throw new InternalServerErrorException(
        'PASSWORD_PEPPER não foi definido no .env',
      );
    }

    const senhaHash = await argon2.hash(plainPassword, {
      type: argon2.argon2id,
      secret: Buffer.from(PEPPER, 'utf8'),
    });

    await this.usersRepository.update(
      { user_id: userId },
      { password_hash: senhaHash },
    );
  }

  /* ---------------- funcionário com celular + PIN (spec 2026-10-21) ---------------- */

  private async hashSecret(plain: string): Promise<string> {
    const PEPPER = this.configService.get<string>('PASSWORD_PEPPER');
    if (!PEPPER) {
      throw new InternalServerErrorException('PASSWORD_PEPPER não foi definido no .env');
    }
    return argon2.hash(plain, { type: argon2.argon2id, secret: Buffer.from(PEPPER, 'utf8') });
  }

  async findByPhone(phone: string): Promise<Users | null> {
    return this.usersRepository.findOne({ where: { phone: normalizePhone(phone) }, relations: { tenant: true } });
  }

  /** Convite por celular aceito: nasce ativo, na oficina e no cargo do convite, sem e-mail. */
  async createFromPhoneInvite(name: string, phone: string, pin: string, tenant: Tenants, role: Role): Promise<Users> {
    if (await this.findByPhone(phone)) {
      throw new ConflictException('Esse celular já está cadastrado.');
    }
    const user = this.usersRepository.create({
      name,
      phone: normalizePhone(phone),
      email: null,
      password_hash: null,
      pin_hash: await this.hashSecret(pin),
      tenant,
      role,
      is_active: true,
    });
    return this.usersRepository.save(user);
  }

  /** Novo acesso: troca o PIN e solta a trava. */
  async setPin(userId: number, pin: string): Promise<void> {
    await this.usersRepository.update(
      { user_id: userId },
      { pin_hash: await this.hashSecret(pin), failed_pin_attempts: 0, pin_locked_until: null },
    );
  }

  /** Usuário pro login por PIN, com o hash (que tem select: false). */
  async findPinUser(phone: string): Promise<Users | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.pin_hash')
      .where('user.phone = :phone', { phone: normalizePhone(phone) })
      .getOne();
  }

  /**
   * Conta a tentativa ANTES de conferir o PIN, num UPDATE atômico (sem corrida entre requisições
   * paralelas). Trava vencida recomeça a contagem. Devolve a contagem e a trava atual.
   */
  async reservePinAttempt(userId: number, now: Date): Promise<{ count: number; lockedUntil: Date | null }> {
    const rows: { n: number; locked: Date | null }[] = await this.usersRepository.query(
      `UPDATE users SET
         failed_pin_attempts = CASE WHEN pin_locked_until IS NOT NULL AND pin_locked_until <= @1 THEN 1 ELSE failed_pin_attempts + 1 END,
         pin_locked_until = CASE WHEN pin_locked_until IS NOT NULL AND pin_locked_until <= @1 THEN NULL ELSE pin_locked_until END
       OUTPUT inserted.failed_pin_attempts AS n, inserted.pin_locked_until AS locked
       WHERE user_id = @0`,
      [userId, now],
    );
    return { count: rows[0]?.n ?? 0, lockedUntil: rows[0]?.locked ?? null };
  }

  /** Trava (só se ainda não estiver travada: a primeira trava vale). */
  async lockPin(userId: number, until: Date, now: Date): Promise<void> {
    await this.usersRepository.query(
      `UPDATE users SET pin_locked_until = @1 WHERE user_id = @0 AND (pin_locked_until IS NULL OR pin_locked_until <= @2)`,
      [userId, until, now],
    );
  }

  async resetPinState(userId: number): Promise<void> {
    await this.usersRepository.update({ user_id: userId }, { failed_pin_attempts: 0, pin_locked_until: null });
  }

  private dummyHash: Promise<string> | null = null;

  /** Celular inexistente também paga o custo do argon2: o tempo de resposta não revela quem tem conta. */
  async burnPinCheck(pin: string): Promise<void> {
    this.dummyHash ??= this.hashSecret('000000-oficinasync');
    await this.verifyHash(pin, await this.dummyHash).catch(() => false);
  }

  /* ---------------- equipe (só o dono) ---------------- */

  private async requireOwner(ownerId: number) {
    const owner = await this.findById(ownerId);
    if (owner.role !== Role.OWNER || !owner.tenant) {
      throw new ForbiddenException('Só o dono da oficina gerencia a equipe.');
    }
    return owner as Users & { tenant: Tenants };
  }

  private toMember(u: Users) {
    return {
      user_id: u.user_id,
      name: u.name,
      role: u.role,
      email: u.email,
      phone: u.phone,
      is_active: u.is_active,
      created_at: u.created_at,
    };
  }

  /** Funcionários da oficina do dono, inclusive os desativados. */
  async listMembers(ownerId: number) {
    const owner = await this.requireOwner(ownerId);
    const users = await this.usersRepository.find({
      where: { tenant: { id: owner.tenant.id } },
      order: { name: 'ASC' },
    });
    return users.map((u) => this.toMember(u));
  }

  /** Desativar corta o acesso na hora (o JwtAuthGuard confere is_active); reativar devolve. */
  async setActive(ownerId: number, targetId: number, active: boolean) {
    const owner = await this.requireOwner(ownerId);
    if (targetId === owner.user_id) {
      throw new BadRequestException('O dono não pode desativar a própria conta.');
    }
    const target = await this.usersRepository.findOne({ where: { user_id: targetId }, relations: { tenant: true } });
    if (!target || target.tenant?.id !== owner.tenant.id) {
      throw new ForbiddenException('Esse funcionário não é da sua oficina.');
    }
    target.is_active = active;
    await this.usersRepository.save(target);
    return this.toMember(target);
  }
}
