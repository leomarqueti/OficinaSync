import { describe, expect, it } from 'vitest';
import { bateriaResultadoFromVerdict } from '../../frontend/oficinasync-web/src/components/tests/testTypes';

describe('teste de bateria pergunta o resultado uma vez só', () => {
  it('o veredito geral define o selo da bateria (antes pedia "Resultado" e "Veredito" separados)', () => {
    expect(bateriaResultadoFromVerdict('approved')).toBe('APROVADA');
    expect(bateriaResultadoFromVerdict('failed')).toBe('REPROVADA');
    expect(bateriaResultadoFromVerdict('inconclusive')).toBe('INSPECAO');
    expect(bateriaResultadoFromVerdict('')).toBe('');
  });
});
