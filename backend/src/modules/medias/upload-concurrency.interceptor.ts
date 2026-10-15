import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, finalize } from 'rxjs';
import { ConcurrencyLimiter } from '../video/concurrency-limiter';

/**
 * O multer guarda o arquivo inteiro em memória (até 100 MB). Sem teto de concorrência,
 * poucos uploads simultâneos estourariam a RAM da VPS, que também roda SQL Server e MinIO.
 * Deve vir ANTES do FileInterceptor em @UseInterceptors — é ele que segura a vaga enquanto
 * o multer lê o corpo da requisição.
 */
export const MAX_CONCURRENT_UPLOADS = 4;

@Injectable()
export class UploadConcurrencyInterceptor implements NestInterceptor {
  private readonly limiter = new ConcurrencyLimiter(MAX_CONCURRENT_UPLOADS);

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.limiter.tryAcquire()) {
      throw new HttpException(
        'Muitos envios ao mesmo tempo. Tente de novo em instantes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle().pipe(finalize(() => this.limiter.release()));
  }
}
