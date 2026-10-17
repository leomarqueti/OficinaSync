import { describe, expect, it } from 'vitest';
import { visibleStepTypes } from '../../frontend/oficinasync-web/src/components/os/types';

describe('etapas mostradas na trilha da OS', () => {
  it('com o OBD desligado, "Scanner / OBD" não aparece como etapa a criar', () => {
    expect(visibleStepTypes(new Set(), false)).not.toContain('obd_scan');
    expect(visibleStepTypes(new Set(), false)).toEqual(['checkin', 'diagnosis', 'repair', 'preventive', 'final']);
  });

  it('se a OS já tem leitura do scanner, a etapa continua aparecendo (não some dado existente)', () => {
    expect(visibleStepTypes(new Set(['obd_scan']), false)).toContain('obd_scan');
  });

  it('com o OBD ligado, aparece na ordem de sempre', () => {
    expect(visibleStepTypes(new Set(), true)).toEqual(['checkin', 'obd_scan', 'diagnosis', 'repair', 'preventive', 'final']);
  });
});
