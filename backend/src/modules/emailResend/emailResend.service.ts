/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_KEY');

    if (!apiKey) {
      throw new Error('RESEND_KEY não configurado');
    }

    this.resend = new Resend(apiKey);
  }

  /*async sendVerificationEmail(email, token, name) {
    return this.resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Ola, ' + name,
      html: `<a href="http://localhost:3000/verify?token=${token}">Verificar conta</a>`,
    });
  }*/
}
