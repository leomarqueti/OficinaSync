import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CAR_BRANDS } from '@/lib/carBrands';
import { emptyGuidedState } from '@/lib/guidedOpen';
import { BrandStep, ModelStep } from '@/components/guided-open/ChoiceSteps';
import { PhotosStep } from '@/components/guided-open/PhotosStep';
import { ReviewStep } from '@/components/guided-open/ReviewStep';
import { StepFrame } from '@/components/guided-open/StepFrame';
import { emptyGuidedFiles } from '@/components/guided-open/types';

const noop = () => undefined;

describe('telas da abertura guiada', () => {
  it('marca: todas as marcas da lista + "Outra"', () => {
    const html = renderToStaticMarkup(<BrandStep state={emptyGuidedState()} onChange={noop} onNext={noop} />);
    for (const brand of CAR_BRANDS) expect(html).toContain(brand);
    expect(html).toContain('Outra');
  });

  it('modelo: só os da marca escolhida', () => {
    const html = renderToStaticMarkup(
      <ModelStep state={{ ...emptyGuidedState(), brand: 'Volkswagen' }} onChange={noop} onNext={noop} />,
    );
    expect(html).toContain('Gol');
    expect(html).not.toContain('>Uno<');
    expect(html).toContain('Não achei');
  });

  it('fotos: depois da frente, o lado da vez é a traseira', () => {
    const state = { ...emptyGuidedState(), photos: { front: true, rear: false, left: false, right: false } };
    const html = renderToStaticMarkup(
      <PhotosStep state={state} onChange={noop} onNext={noop} files={emptyGuidedFiles()} onFiles={noop} />,
    );
    expect(html).toContain('data-current="rear"');
    expect(html).toContain('Tirar foto da traseira');
  });

  it('conferir: cliente ausente aparece como "o escritório completa"', () => {
    const state = { ...emptyGuidedState(), plate: 'ABC1D23', clientPresent: false };
    const html = renderToStaticMarkup(<ReviewStep state={state} files={emptyGuidedFiles()} onEdit={noop} />);
    expect(html).toContain('O escritório completa');
  });

  it('moldura da tela: botão travado mostra o que falta', () => {
    const html = renderToStaticMarkup(
      <StepFrame index={0} total={10} title="Qual a placa?" onBack={noop} next={{ disabled: true, hint: 'Falta: placa válida', onNext: noop }}>
        <p>conteúdo</p>
      </StepFrame>,
    );
    expect(html).toContain('Falta: placa válida');
    expect(html).toContain('Qual a placa?');
  });
});
