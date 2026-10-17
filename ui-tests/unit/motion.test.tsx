import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Celebrate } from '@/components/motion/Celebrate';
import { PhotoFlash } from '@/components/motion/PhotoFlash';

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('comemoração', () => {
  it('mostra a mensagem como status (leitor de tela anuncia) e solta 6 confetes', () => {
    const html = renderToStaticMarkup(<Celebrate message="O cliente já pode ver" reduced={false} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('O cliente já pode ver');
    expect(count(html, 'data-confetti')).toBe(6);
  });

  it('com menos movimento: só o visto e a mensagem, sem confete nem onda', () => {
    const html = renderToStaticMarkup(<Celebrate message="OS finalizada" reduced />);
    expect(html).toContain('OS finalizada');
    expect(html).not.toContain('data-confetti');
    expect(html).not.toContain('data-ring');
  });
});

describe('flash da foto', () => {
  it('não aparece antes da primeira foto', () => {
    expect(renderToStaticMarkup(<PhotoFlash flashKey={0} />)).toBe('');
  });

  it('aparece quando uma foto é tirada', () => {
    expect(renderToStaticMarkup(<PhotoFlash flashKey={1} />)).toContain('data-photo-flash');
  });
});
