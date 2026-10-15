import { HttpException, HttpStatus } from '@nestjs/common';
import { Subject } from 'rxjs';
import {
  MAX_CONCURRENT_UPLOADS,
  UploadConcurrencyInterceptor,
} from './upload-concurrency.interceptor';

const ctx = {} as never;

function startUpload(interceptor: UploadConcurrencyInterceptor) {
  const inFlight = new Subject<void>();
  const observable = interceptor.intercept(ctx, { handle: () => inFlight });
  observable.subscribe({ error: () => undefined });
  return inFlight;
}

describe('UploadConcurrencyInterceptor', () => {
  it(`aceita até ${MAX_CONCURRENT_UPLOADS} uploads em voo e responde 429 no seguinte`, () => {
    const interceptor = new UploadConcurrencyInterceptor();

    for (let i = 0; i < MAX_CONCURRENT_UPLOADS; i++) startUpload(interceptor);

    expect(() => startUpload(interceptor)).toThrow(HttpException);
    try {
      startUpload(interceptor);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('libera a vaga quando o upload termina', () => {
    const interceptor = new UploadConcurrencyInterceptor();
    const first = startUpload(interceptor);
    for (let i = 1; i < MAX_CONCURRENT_UPLOADS; i++) startUpload(interceptor);

    first.complete();

    expect(() => startUpload(interceptor)).not.toThrow();
  });

  it('libera a vaga também quando o upload falha', () => {
    const interceptor = new UploadConcurrencyInterceptor();
    const first = startUpload(interceptor);
    for (let i = 1; i < MAX_CONCURRENT_UPLOADS; i++) startUpload(interceptor);

    first.error(new Error('conexão caiu'));

    expect(() => startUpload(interceptor)).not.toThrow();
  });
});
