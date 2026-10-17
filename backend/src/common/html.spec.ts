import { escapeHtml, oneLine } from './html';

describe('escapeHtml', () => {
  it('escapa os caracteres que abrem tag ou atributo', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
    expect(escapeHtml(`a & b 'c'`)).toBe('a &amp; b &#39;c&#39;');
  });

  it('null, undefined e números viram texto seguro', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(42)).toBe('42');
  });

  it('não escapa duas vezes o que já veio escapado pelo chamador (idempotência não é promessa: & vira &amp;)', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });
});

describe('oneLine', () => {
  it('tira quebras de linha (cabeçalho de e-mail não pode ser injetado)', () => {
    expect(oneLine('Oi\r\nBcc: x@y.com')).toBe('Oi Bcc: x@y.com');
  });
});
