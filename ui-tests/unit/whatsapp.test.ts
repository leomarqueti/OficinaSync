import { describe, expect, it } from 'vitest';
import { whatsappShareUrl } from '../../frontend/oficinasync-web/src/lib/whatsapp';

describe('mandar o link do serviço no WhatsApp', () => {
  it('com telefone do cliente: abre a conversa dele com a mensagem pronta', () => {
    const url = whatsappShareUrl({ phone: '+5514997001122', clientName: 'antônio silva', carName: 'Fiat Uno', link: 'https://x.com/servico/abc' });
    expect(url.startsWith('https://wa.me/5514997001122?text=')).toBe(true);
    const text = decodeURIComponent(url.split('?text=')[1]);
    expect(text).toContain('Olá, Antônio!');
    expect(text).toContain('Fiat Uno');
    expect(text).toContain('https://x.com/servico/abc');
  });

  it('sem telefone ou sem nome: deixa escolher o contato e cumprimenta sem nome', () => {
    const url = whatsappShareUrl({ phone: null, clientName: null, carName: 'Veículo sem modelo informado', link: 'https://x.com/servico/abc' });
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    const text = decodeURIComponent(url.split('?text=')[1]);
    expect(text.startsWith('Olá!')).toBe(true);
    expect(text).toContain('seu veículo');
  });
});
