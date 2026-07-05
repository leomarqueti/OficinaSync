import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { PasswordResets } from './password_resets.entity';

const TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1h — mais curto que o de verificação de email por ser mais sensível.

@Injectable()
export class PasswordResetsService {
  constructor(
    @InjectRepository(PasswordResets)
    private passwordResetsRepository: Repository<PasswordResets>,
  ) {}

  async createToken(userId: number): Promise<string> {
    const token = randomBytes(32).toString('hex');

    const reset = this.passwordResetsRepository.create({
      token,
      expires_at: new Date(Date.now() + TOKEN_EXPIRATION_MS),
      users: { user_id: userId },
    });

    await this.passwordResetsRepository.save(reset);

    return token;
  }

  async consumeToken(token: string): Promise<number> {
    const reset = await this.passwordResetsRepository.findOne({
      where: { token },
      relations: { users: true },
    });

    if (!reset) {
      throw new UnauthorizedException('Link inválido ou expirado.');
    }

    if (reset.used_at != null) {
      throw new UnauthorizedException('Link inválido ou expirado.');
    }

    if (new Date() > reset.expires_at) {
      throw new UnauthorizedException('Link inválido ou expirado.');
    }

    reset.used_at = new Date();
    await this.passwordResetsRepository.save(reset);

    return reset.users.user_id;
  }
}
