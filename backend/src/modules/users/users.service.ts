/* eslint-disable prettier/prettier */
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from './users.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-users.dto';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { Tenants } from '../tenants/tenants.entity';

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

  async updateTenantId(userId: number, tenant: Tenants) {
    const user = await this.usersRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new Error('Usuario nao encontrado!');
    }

    user.tenant = tenant;

    await this.usersRepository.save(user);
  }
}
