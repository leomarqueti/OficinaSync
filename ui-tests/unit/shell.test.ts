import { describe, expect, it } from 'vitest';
import { shellFor } from '../../frontend/oficinasync-web/src/components/shell/shellFor';

describe('qual casca mostrar', () => {
  it('carregando o usuário pela primeira vez → tela de carregando', () => {
    expect(shellFor(true, false, null)).toBe('loading');
  });

  it('usuário carregado → a casca do modo dele', () => {
    expect(shellFor(false, true, 'simple')).toBe('simple');
    expect(shellFor(false, true, 'control')).toBe('control');
  });

  it('falhou ao buscar o usuário (token vencido) → não fica girando: casca de controle, a página trata o login', () => {
    expect(shellFor(false, false, null)).toBe('control');
  });
});
