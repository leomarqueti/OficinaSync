import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAddressByCep,
  formatCep,
} from '../../frontend/oficinasync-web/src/lib/viaCep';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(impl: () => Promise<unknown>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

const jsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body });

describe('fetchAddressByCep', () => {
  it('devolve logradouro, bairro, cidade e UF do CEP encontrado', async () => {
    const fetchMock = stubFetch(async () =>
      jsonResponse({
        logradouro: 'Praça da Sé',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    );

    const result = await fetchAddressByCep('01001-000');

    expect(result).toEqual({
      logradouro: 'Praça da Sé',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/');
  });

  it('CEP que não existe ({"erro": true}) vira null', async () => {
    stubFetch(async () => jsonResponse({ erro: true }));
    expect(await fetchAddressByCep('99999999')).toBeNull();
  });

  it('CEP incompleto nem chama a rede', async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));
    expect(await fetchAddressByCep('0100')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falha de rede ou resposta HTTP de erro vira null (nunca quebra o formulário)', async () => {
    stubFetch(async () => {
      throw new Error('sem internet');
    });
    expect(await fetchAddressByCep('01001000')).toBeNull();

    stubFetch(async () => jsonResponse({}, false));
    expect(await fetchAddressByCep('01001000')).toBeNull();
  });

  it('campos ausentes na resposta viram string vazia', async () => {
    stubFetch(async () => jsonResponse({ localidade: 'Tupanciretã', uf: 'RS' }));
    expect(await fetchAddressByCep('98170000')).toEqual({
      logradouro: '',
      bairro: '',
      localidade: 'Tupanciretã',
      uf: 'RS',
    });
  });
});

describe('formatCep', () => {
  it('coloca o hífen depois do 5º dígito', () => {
    expect(formatCep('01001')).toBe('01001');
    expect(formatCep('01001000')).toBe('01001-000');
  });
});
