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

  async sendVerificationEmail(email, token, name) {
    const { data, error } = await this.resend.emails.send({
      from: 'OficinaSync <no-reply@oficinasync.com.br>',
      to: [email],
      subject: 'Ola, ' + name,
      html: `<a href="http://localhost:3000/verify?token=${token}">Verificar conta</a>`,
    });

    console.log('RESEND DATA:', data);
    console.log('RESEND ERROR:', error);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
