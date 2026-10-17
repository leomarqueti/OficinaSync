import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith('.ts') && !full.endsWith('.spec.ts') ? [full] : [];
  });
}

describe('logs', () => {
  // console.log vazou token de verificação de e-mail e dados de mídia nos logs do servidor.
  it('o código de produção não usa console.log (use o Logger do Nest, sem dados pessoais/tokens)', () => {
    const offenders = sourceFiles(join(__dirname, '..')).filter((f) =>
      /console\.log\(/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders.map((f) => f.replace(join(__dirname, '..'), ''))).toEqual([]);
  });
});
