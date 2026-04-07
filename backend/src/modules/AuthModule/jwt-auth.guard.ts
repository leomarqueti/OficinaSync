/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-wrapper-object-types */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Vamos pegar a requisisão atual
    const request = context.switchToHttp().getRequest<Request>();

    /*
        Alem de pegar a requisição vamos ter que pegar a autorização
        com ela conseguimos validar de é validade ou não, essa autorizaçao
        ficar dentro do header
    */

    const authHeader = request.get('authorization');

    if (!authHeader) {
      throw new UnauthorizedException('Token ausente');
    }

    // vamos separar o tipo e token
    const [type, token] = authHeader.split(' ');

    //vamos fazer uma verificação se nao for do tipo bearer ou sem token , invalidamos
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato do token invalido!');
    }

    try {
      // agora vamos validar se o token é valido e nao esta expirado
      const payload = await this.jwtService.verifyAsync(token);

      (request as any).user = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado!');
    }
  }
}
