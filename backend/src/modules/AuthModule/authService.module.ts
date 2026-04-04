/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { CreateUserDto } from '../users/dto/create-users.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  //Pegamos do modulo de usuario a criaçao do usuario para ficar tudo junto no modulo de auteticação
  constructor(private usersService: UsersService) {}
  async register(createUserDto: CreateUserDto) {
    await this.usersService.create(createUserDto);

    // usamos a biblioteca cryptp para criar um token de 32 bits e hexadecimal
    const token = randomBytes(32).toString('hex');

    console.log(token);
  }
}
