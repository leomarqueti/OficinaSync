import { ConcurrencyLimiter } from './concurrency-limiter';

describe('ConcurrencyLimiter', () => {
  it('com max 1: o primeiro adquire, o segundo é recusado, depois de liberar volta a adquirir', () => {
    const limiter = new ConcurrencyLimiter(1);

    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);

    limiter.release();
    expect(limiter.tryAcquire()).toBe(true);
  });

  it('release a mais não deixa o contador negativo (não "cria" vagas)', () => {
    const limiter = new ConcurrencyLimiter(1);

    limiter.release();
    limiter.release();

    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });
});
