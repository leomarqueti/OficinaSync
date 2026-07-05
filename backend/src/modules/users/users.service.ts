/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable prettier/prettier */
import {
  ConflictException,
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
      throw new UnauthorizedException('Credenciais inválidas');
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
}
