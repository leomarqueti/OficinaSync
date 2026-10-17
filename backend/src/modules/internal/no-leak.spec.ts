import { readFileSync } from 'fs';
import { join } from 'path';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('área interna não pode alimentar o cliente final', () => {
  const FORBIDDEN =
    /ServiceOrderParts|ServiceOrderServices|ServiceOrderParticipants|internal_notes|share_percent|modules\/internal|\.\.\/internal\//;

  it.each(['report/report.service.ts', 'report/report.template.ts', 'sections/section.service.ts'])(
    '%s não referencia dados internos',
    (file) => {
      expect(read(file)).not.toMatch(FORBIDDEN);
    },
  );

  it('findByPublicToken (rota pública) não referencia dados internos', () => {
    const src = read('serviceOrder/serviceOrder.service.ts');
    const start = src.indexOf('async findByPublicToken');
    const end = src.indexOf('async findAll', start);
    expect(start).toBeGreaterThan(-1);
    expect(src.slice(start, end)).not.toMatch(FORBIDDEN);
  });
});
