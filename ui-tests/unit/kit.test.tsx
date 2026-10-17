import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AlertBanner,
  BigButton,
  PageHeader,
  SelectField,
  StatusChip,
  TextField,
  fieldClass,
} from '@/components/kit';

describe('BigButton', () => {
  it('habilitado: grande (≥56px), caixa alta, sem dica', () => {
    const html = renderToStaticMarkup(<BigButton hint="não aparece">Abrir carro novo</BigButton>);
    expect(html).toContain('min-h-14');
    expect(html).toContain('uppercase');
    expect(html).not.toContain('não aparece');
  });

  it('desabilitado: explica POR QUE está travado e liga a dica ao botão', () => {
    const html = renderToStaticMarkup(
      <BigButton disabled hint="Tire a foto da frente pra continuar">
        Continuar
      </BigButton>,
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('Tire a foto da frente pra continuar');
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain('bg-white/10');
    expect(html).not.toContain('bg-brand ');
  });

  it('hero tem 64px', () => {
    expect(renderToStaticMarkup(<BigButton size="hero">Ir</BigButton>)).toContain('min-h-16');
  });
});

describe('campos', () => {
  it('rótulo ligado ao campo e erro ligado por aria-describedby', () => {
    const html = renderToStaticMarkup(<TextField id="placa" label="Placa" error="Placa inválida" />);
    expect(html).toContain('for="placa"');
    expect(html).toContain('id="placa"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="placa-error"');
    expect(html).toContain('Placa inválida');
  });

  it('campo tem 48px e texto 16px (não dá zoom no iPhone)', () => {
    expect(fieldClass).toContain('h-12');
    expect(fieldClass).toContain('text-base');
  });

  it('select usa o mesmo visual do input', () => {
    const html = renderToStaticMarkup(
      <SelectField id="comb" label="Combustível">
        <option value="flex">Flex</option>
      </SelectField>,
    );
    expect(html).toContain('h-12');
    expect(html).toContain('appearance-none');
  });
});

describe('sinais de status', () => {
  it('chip de alerta é amarelo, de ok é limão', () => {
    expect(renderToStaticMarkup(<StatusChip tone="alert">Sem foto</StatusChip>)).toContain('text-warning');
    expect(renderToStaticMarkup(<StatusChip tone="ok">Pronto</StatusChip>)).toContain('text-brand');
  });

  it('aviso amarelo com borda esquerda e ação opcional', () => {
    const html = renderToStaticMarkup(
      <AlertBanner actionLabel="Tirar agora" onAction={() => undefined}>
        Falta foto de entrada
      </AlertBanner>,
    );
    expect(html).toContain('border-l-4');
    expect(html).toContain('border-warning');
    expect(html).toContain('Tirar agora');
  });

  it('título da página trunca nome longo em vez de estourar a tela', () => {
    const html = renderToStaticMarkup(<PageHeader title="Auto Elétrica e Mecânica Lima & Filhos Ltda" />);
    expect(html).toContain('<h1');
    expect(html).toContain('truncate');
  });
});
