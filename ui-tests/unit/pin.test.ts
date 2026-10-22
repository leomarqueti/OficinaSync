import { describe, expect, it } from 'vitest';
import { isWeakPin } from '../../frontend/oficinasync-web/src/lib/pin';
import { whatsappInviteUrl } from '../../frontend/oficinasync-web/src/lib/whatsapp';

// Espelho das regras do backend (backend/src/modules/users/pin-policy.ts): a tela avisa antes de enviar.
describe('PIN fraco (mesmas regras do servidor)', () => {
  it.each(['000000', '111111', '123456', '654321', '012345', '121212', '112233', '123123', '12345', '12345a', ''])(
    '"%s" é recusado',
    (pin) => expect(isWeakPin(pin)).toBe(true),
  );
  it.each(['482915', '907364'])('"%s" é aceito', (pin) => expect(isWeakPin(pin)).toBe(false));
});

describe('convite pelo WhatsApp', () => {
  it('abre a conversa com o celular do funcionário e a mensagem com o link', () => {
    const url = whatsappInviteUrl('+5514999990001', 'Antônio Carlos', 'Lima Auto Elétrica', 'https://app/convite?token=abc');
    expect(url.startsWith('https://wa.me/5514999990001?text=')).toBe(true);
    const text = decodeURIComponent(url.split('?text=')[1]);
    expect(text).toContain('Olá, Antônio!');
    expect(text).toContain('Lima Auto Elétrica');
    expect(text).toContain('https://app/convite?token=abc');
    expect(text).toContain('24 horas');
  });
});
