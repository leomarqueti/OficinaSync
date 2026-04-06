/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Email_verifications } from './email_verifications.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class Email_verificationsService {
  constructor(
    @InjectRepository(Email_verifications)
    private email_VerificationRepository: Repository<Email_verifications>,
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
}
