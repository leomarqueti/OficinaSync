/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Email_verifications } from './email_verifications.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersService } from '../users/users.service';

@Injectable()
export class Email_verificationsService {
  constructor(
    @InjectRepository(Email_verifications)
    private email_VerificationRepository: Repository<Email_verifications>,
    private usersService: UsersService,
  ) {}

  async saveToken(user_id: number, token: string) {
    const dataExpiracao = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const newEmailVerification = this.email_VerificationRepository.create({
      token: token,
      expires_at: dataExpiracao,
      users: { user_id: user_id },
    });

    await this.email_VerificationRepository.save(newEmailVerification);
  }

  //aqui verificamos o token que volta quando o usuario clica no email dele
  async verifyEmailToken(token: string) {
    const email = await this.email_VerificationRepository.findOne({
      where: {
        token: token,
      },
      relations: {
        users: true,
      },
    });

    /*
     Pegamos o email dele e fazemos 3 verificaçoes:
     - O token existe?
     - O token ja foi usado?
     - O email ja expirou?
    */

    if (!email) {
      throw new UnauthorizedException('Token invalido!');
    }

    if (email.used_at != null) {
      throw new UnauthorizedException('Token invalido!');
    }

    const dateNow = new Date();

    if (dateNow > email.expires_at) {
      throw new UnauthorizedException('Token invalido!');
    }

    email.used_at = dateNow;

    await this.email_VerificationRepository.save(email);

    // por fiz nos fizemos uma funçao no userservice que activa o usuario

    await this.usersService.activeUser(email.users.user_id);
  }
}
