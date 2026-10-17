import { describe, expect, it, vi } from 'vitest';
import { haptic } from '../../frontend/oficinasync-web/src/lib/haptics';

describe('vibração de confirmação', () => {
  it('vibra 10ms quando o aparelho suporta', () => {
    const vibrate = vi.fn(() => true);
    haptic({ vibrate }, false);
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('não vibra quando a pessoa pediu menos movimento', () => {
    const vibrate = vi.fn(() => true);
    haptic({ vibrate }, true);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('aparelho sem vibração (iPhone/computador) ou que lança erro não quebra', () => {
    expect(() => haptic({}, false)).not.toThrow();
    expect(() => haptic(undefined, false)).not.toThrow();
    expect(() =>
      haptic(
        {
          vibrate: () => {
            throw new Error('sem gesto');
          },
        },
        false,
      ),
    ).not.toThrow();
  });
});
