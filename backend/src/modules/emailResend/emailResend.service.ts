/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly resend: Resend | undefined;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_KEY');

    // Sem RESEND_KEY, a aplicação sobe normalmente — só o envio de email
    // fica indisponível (erro lançado apenas na hora de enviar, não no boot).
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendVerificationEmail(email, token, name) {
    if (!this.resend) {
      throw new Error('RESEND_KEY não configurado');
    }

    const backendUrl =
      this.configService.get<string>('BACKEND_URL') ?? 'http://localhost:3000';

    const { data, error } = await this.resend.emails.send({
      from: 'OficinaSync <no-reply@oficinasync.com.br>',
      to: [email],
      subject: 'Ola, ' + name,
      html: `<a href="${backendUrl}/auth/verify-email?token=${token}">Verificar conta</a>`,
    });

    console.log('RESEND DATA:', data);
    console.log('RESEND ERROR:', error);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
