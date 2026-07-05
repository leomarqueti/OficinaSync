/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { CreateUserDto } from '../users/dto/create-users.dto';
import { UsersService } from '../users/users.service';
import { Email_verificationsService } from '../email_verifications/email_verifications.service';
import { PasswordResetsService } from '../password_resets/password_resets.service';
import { EmailService } from '../emailResend/emailResend.service';
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
    private passwordResetsService: PasswordResetsService,
    private emailService: EmailService,
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

  async login(email: string, senha: string) {
    const user = await this.usersService.findHashPassword(email);

    if (!user) {
      throw new UnauthorizedException('Usuario ou senha invalidos!');
    }

    const hashVerify = await this.usersService.verifyHash(
      senha,
      user.password_hash,
    );

    if (!hashVerify) {
      throw new UnauthorizedException('Usuario ou senha invalidos!');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Email não verificado!');
    }

    const payload = {
      sub: user.user_id,
      email: user.email,
      scope: 'access',
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async verifyEmail(token: string) {
    await this.email_verificationService.verifyEmailToken(token);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Não revelamos se o email existe ou não — sempre a mesma resposta pro frontend.
    if (user) {
      const token = await this.passwordResetsService.createToken(
        user.user_id,
      );

      await this.emailService.sendPasswordResetEmail(
        user.email,
        token,
        user.name,
      );
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.passwordResetsService.consumeToken(token);

    await this.usersService.updatePassword(userId, newPassword);
  }
}
