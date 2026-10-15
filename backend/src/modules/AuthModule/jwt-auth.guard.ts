/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { TOKEN_SCOPE_KEY } from './token-scope.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.get('authorization');

    if (!authHeader) {
      throw new UnauthorizedException('Token ausente');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato do token invalido!');
    }

    let payload: any;

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado!');
    }

    // Token de onboarding (cadastro em 2 etapas) só vale em rotas que o pedem
    // explicitamente; todas as outras exigem 'access'. Token antigo sem scope
    // conta como 'access' (compatibilidade até expirar).
    const requiredScope =
      this.reflector.getAllAndOverride<string>(TOKEN_SCOPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'access';
    const tokenScope = payload.scope ?? 'access';

    if (tokenScope !== requiredScope) {
      throw new UnauthorizedException('Token sem permissão para esta rota.');
    }

    (request as any).user = payload;

    return true;
  }
}
