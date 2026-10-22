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
import { isPinLocked, registerPinFailure } from '../users/pin-policy';
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

    // funcionário que só tem celular + PIN não tem senha: mesmo erro de senha errada
    if (!user || !user.password_hash) {
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

  async pinLogin(phone: string, pin: string) {
    const invalid = new UnauthorizedException('Celular ou PIN inválidos.');
    const now = new Date();
    const lockedMessage = (until: Date) =>
      new UnauthorizedException(
        `Muitas tentativas. Tente de novo às ${until.toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
        })} ou peça um novo acesso ao dono.`,
      );

    const user = await this.usersService.findPinUser(phone);
    // mesma resposta pra celular inexistente e PIN errado: não revela quem tem conta
    if (!user || !user.pin_hash) throw invalid;
    if (isPinLocked(user.pin_locked_until, now)) throw lockedMessage(user.pin_locked_until as Date);

    const ok = await this.usersService.verifyHash(pin, user.pin_hash);
    if (!ok) {
      const next = registerPinFailure(user.failed_pin_attempts, now);
      await this.usersService.savePinState(user.user_id, next.attempts, next.lockedUntil);
      throw next.lockedUntil ? lockedMessage(next.lockedUntil) : invalid;
    }

    if (!user.is_active) throw new UnauthorizedException('Acesso desativado.');

    await this.usersService.savePinState(user.user_id, 0, null);
    return {
      access_token: await this.jwtService.signAsync({ sub: user.user_id, email: user.email ?? null, scope: 'access' }),
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
