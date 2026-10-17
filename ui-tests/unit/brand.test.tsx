import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandLogo, BrandSymbol } from '@/components/brand/BrandLogo';

describe('marca', () => {
  it('símbolo é a engrenagem em vetor, limão no fundo escuro', () => {
    const html = renderToStaticMarkup(<BrandSymbol />);
    expect(html).toContain('data-brand="oficinasync-gear"');
    expect(html).toContain('#A3E635');
    expect(html).toContain('aria-hidden="true"');
  });

  it('logo horizontal tem nome acessível e "Sync" em limão', () => {
    const html = renderToStaticMarkup(<BrandLogo />);
    expect(html).toContain('aria-label="OficinaSync"');
    expect(html).toContain('Oficina');
    expect(html).toContain('text-brand');
  });

  it('versão pra fundo claro usa tinta escura e verde-escuro', () => {
    const html = renderToStaticMarkup(<BrandLogo tone="light" />);
    expect(html).toContain('#0A0A0A');
    expect(html).toContain('text-[#4d7c0f]');
  });
});
