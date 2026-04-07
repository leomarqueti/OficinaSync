/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { CreateUserDto } from '../users/dto/create-users.dto';
import { UsersService } from '../users/users.service';
import { Email_verificationsService } from '../email_verifications/email_verifications.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ResponseUserDto } from '../users/dto/response-users.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  //Pegamos do modulo de usuario a criaçao do usuario para ficar tudo junto no modulo de auteticação
  constructor(
    private usersService: UsersService,
    private email_verificationService: Email_verificationsService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  async register(createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);

    const onboardingToken = await this.jwtService.signAsync(
      {
        sub: user.user_id,
        email: user.email,
        name: user.name,
        scope: 'onboarding',
      },
      {
        expiresIn: 900,
      },
    );

    const responseUser = plainToInstance(ResponseUserDto, user);
    return {
      user: responseUser,
      onboarding_token: onboardingToken,
    };
  }

  login() {}
}
