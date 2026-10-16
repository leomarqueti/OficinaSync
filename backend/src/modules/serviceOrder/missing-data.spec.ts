import { computeMissingData, isComplete } from './missing-data';

const fullClient = {
  name: 'Fulano de Tal',
  phone: '+5514997951011',
  cpf: '52998224725',
  address: 'Rua A, 1',
};

const fullCar = {
  brand: 'Chevrolet',
  model: 'Celta',
  year: 2010,
  fuel_type: 'flex',
  color: 'Prata',
  chassis: '9BGKS08Z0AG123456',
  mileage_in: 100000,
};

const fields = (items: { field: string }[]) => items.map((i) => i.field);

describe('computeMissingData', () => {
  it('cliente e carro completos → nada falta', () => {
    const missing = computeMissingData(fullCar, fullClient);
    expect(missing).toEqual({ client: [], car: [] });
    expect(isComplete(missing)).toBe(true);
  });

  it('só a placa existe (carro sem nada, sem cliente) → falta tudo', () => {
    const missing = computeMissingData({}, null);

    expect(fields(missing.client)).toEqual(['name', 'phone', 'cpf', 'address']);
    expect(fields(missing.car)).toEqual([
      'brand',
      'model',
      'year',
      'fuel_type',
      'color',
      'chassis',
      'mileage_in',
    ]);
    expect(isComplete(missing)).toBe(false);
  });

  it('cliente só com o nome → faltam telefone, CPF e endereço', () => {
    const missing = computeMissingData(fullCar, { name: 'Marcos' });

    expect(fields(missing.client)).toEqual(['phone', 'cpf', 'address']);
    expect(missing.car).toEqual([]);
  });

  it('rótulos em português para a tela', () => {
    const missing = computeMissingData({}, null);

    expect(missing.client.map((i) => i.label)).toEqual([
      'nome do cliente',
      'telefone do cliente',
      'CPF do cliente',
      'endereço do cliente',
    ]);
    expect(missing.car.map((i) => i.label)).toEqual([
      'marca',
      'modelo',
      'ano',
      'combustível',
      'cor',
      'chassi',
      'KM de entrada',
    ]);
  });

  it('texto só com espaços conta como vazio', () => {
    const missing = computeMissingData(
      { ...fullCar, brand: '   ', color: '' },
      { ...fullClient, address: '  ' },
    );

    expect(fields(missing.car)).toEqual(['brand', 'color']);
    expect(fields(missing.client)).toEqual(['address']);
  });

  it('chassi com menos de 5 caracteres ainda falta; com exatamente 5 está ok', () => {
    expect(
      fields(computeMissingData({ ...fullCar, chassis: 'ABCD' }, fullClient).car),
    ).toEqual(['chassis']);
    expect(
      computeMissingData({ ...fullCar, chassis: 'ABCDE' }, fullClient).car,
    ).toEqual([]);
  });

  it('KM 0 é um valor válido (carro zero); null/undefined faltam', () => {
    expect(
      computeMissingData({ ...fullCar, mileage_in: 0 }, fullClient).car,
    ).toEqual([]);
    expect(
      fields(
        computeMissingData({ ...fullCar, mileage_in: null }, fullClient).car,
      ),
    ).toEqual(['mileage_in']);
  });

  it('ano 0 (ou antes de 1900) conta como faltando', () => {
    expect(
      fields(computeMissingData({ ...fullCar, year: 0 }, fullClient).car),
    ).toEqual(['year']);
  });

  it('ano null ou ausente falta', () => {
    expect(
      fields(computeMissingData({ ...fullCar, year: null }, fullClient).car),
    ).toEqual(['year']);
  });

  it('e-mail ausente NÃO conta como pendência', () => {
    const missing = computeMissingData(fullCar, {
      ...fullClient,
      email: null,
    } as never);
    expect(isComplete(missing)).toBe(true);
  });
});
