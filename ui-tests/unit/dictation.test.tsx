import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getSpeechRecognition } from '@/lib/dictation';
import { DictationButton } from '@/components/guided-open/DictationButton';

describe('ditado por voz (grátis, do próprio navegador)', () => {
  it('sem suporte no aparelho: não há reconhecimento', () => {
    expect(getSpeechRecognition({})).toBeNull();
    expect(getSpeechRecognition(undefined)).toBeNull();
  });

  it('Chrome/Android (prefixo webkit) é reconhecido', () => {
    class Fake {}
    expect(getSpeechRecognition({ webkitSpeechRecognition: Fake })).toBe(Fake);
    expect(getSpeechRecognition({ SpeechRecognition: Fake })).toBe(Fake);
  });

  it('sem suporte, o botão de falar nem aparece', () => {
    expect(renderToStaticMarkup(<DictationButton onText={() => undefined} />)).toBe('');
  });
});
