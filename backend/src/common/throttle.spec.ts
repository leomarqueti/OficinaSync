import { globalThrottleLimit } from './throttle';

describe('limite global de requisições por IP', () => {
  it('padrão continua 60 por minuto quando a variável não existe', () => {
    expect(globalThrottleLimit({})).toBe(60);
  });

  it('pode ser ajustado por THROTTLE_LIMIT (ex.: testes de tela, oficina com várias pessoas no mesmo roteador)', () => {
    expect(globalThrottleLimit({ THROTTLE_LIMIT: '1000' })).toBe(1000);
  });

  it('valor inválido ou menor que 1 cai no padrão (nunca desliga a proteção sem querer)', () => {
    expect(globalThrottleLimit({ THROTTLE_LIMIT: 'abc' })).toBe(60);
    expect(globalThrottleLimit({ THROTTLE_LIMIT: '0' })).toBe(60);
    expect(globalThrottleLimit({ THROTTLE_LIMIT: '-5' })).toBe(60);
  });
});
