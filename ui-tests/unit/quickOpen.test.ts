import { describe, expect, it } from 'vitest';
import {
  buildQuickCarPayload,
  buildQuickClientPayload,
  pendingLabels,
  quickCarValid,
  quickClientValid,
  type QuickCar,
  type QuickClient,
} from '../../frontend/oficinasync-web/src/lib/quickOpen';

const emptyClient: QuickClient = { name: '', phone: '', cpf: '', email: '', address: '' };
const emptyCar: QuickCar = {
  plate: '',
  brand: '',
  model: '',
  year: '',
  fuelType: '',
  color: '',
  chassis: '',
  mileageIn: '',
};
const plateOnly: QuickCar = { ...emptyCar, plate: 'ABC1D23' };

describe('cliente no modo rápido', () => {
  it('em branco é válido (pular cliente)', () => {
    expect(quickClientValid(emptyClient)).toBe(true);
  });

  it('só o nome é válido; nome de 1 letra não', () => {
    expect(quickClientValid({ ...emptyClient, name: 'Marcos' })).toBe(true);
    expect(quickClientValid({ ...emptyClient, name: 'M' })).toBe(false);
  });

  it('telefone solto sem nome não vale (cliente precisa de nome)', () => {
    expect(quickClientValid({ ...emptyClient, phone: '+5514997951011' })).toBe(false);
  });

  it('campo preenchido precisa ser válido: CPF ruim e telefone incompleto bloqueiam', () => {
    expect(quickClientValid({ ...emptyClient, name: 'Ana', cpf: '11111111111' })).toBe(false);
    expect(quickClientValid({ ...emptyClient, name: 'Ana', phone: '+55149979' })).toBe(false);
    expect(quickClientValid({ ...emptyClient, name: 'Ana', cpf: '52998224725' })).toBe(true);
  });

  it('e-mail preenchido precisa ter formato de e-mail', () => {
    expect(quickClientValid({ ...emptyClient, name: 'Ana', email: 'ana@' })).toBe(false);
    expect(quickClientValid({ ...emptyClient, name: 'Ana', email: 'ana@x.com' })).toBe(true);
  });
});

describe('carro no modo rápido', () => {
  it('só a placa basta; sem placa ou com placa inválida não', () => {
    expect(quickCarValid(plateOnly)).toBe(true);
    expect(quickCarValid(emptyCar)).toBe(false);
    expect(quickCarValid({ ...emptyCar, plate: 'AB-12345' })).toBe(false);
  });

  it('o que for preenchido precisa ser válido: ano 1900 e chassi curto bloqueiam', () => {
    expect(quickCarValid({ ...plateOnly, year: '1900' })).toBe(false);
    expect(quickCarValid({ ...plateOnly, chassis: 'ABCD' })).toBe(false);
    expect(quickCarValid({ ...plateOnly, year: '2010', chassis: 'ABCDE' })).toBe(true);
  });
});

describe('payloads só com o que foi preenchido', () => {
  it('cliente sem nome → null (nada a criar)', () => {
    expect(buildQuickClientPayload(emptyClient)).toBeNull();
  });

  it('cliente só com nome → só { name }', () => {
    expect(buildQuickClientPayload({ ...emptyClient, name: '  Marcos ' })).toEqual({ name: 'Marcos' });
  });

  it('cliente completo manda CPF só em dígitos', () => {
    expect(
      buildQuickClientPayload({
        name: 'Ana',
        phone: '+5514997951011',
        cpf: '529.982.247-25',
        email: 'a@b.com',
        address: ' Rua A ',
      }),
    ).toEqual({
      name: 'Ana',
      phone: '+5514997951011',
      cpf: '52998224725',
      email: 'a@b.com',
      address: 'Rua A',
    });
  });

  it('carro só com placa → só { plate } (sem NaN, sem 0, sem "flex" inventado)', () => {
    expect(buildQuickCarPayload(plateOnly, null)).toEqual({ plate: 'ABC1D23' });
  });

  it('carro com client_id e dados → manda só o que existe, números como número', () => {
    expect(
      buildQuickCarPayload(
        {
          plate: 'abc-1d23',
          brand: ' Fiat ',
          model: 'Uno',
          year: '2008',
          fuelType: 'flex',
          color: 'Branco',
          chassis: '9bd15822a8y123456',
          mileageIn: '120000',
        },
        7,
      ),
    ).toEqual({
      plate: 'ABC1D23',
      brand: 'Fiat',
      model: 'Uno',
      year: 2008,
      fuel_type: 'flex',
      color: 'Branco',
      chassis: '9BD15822A8Y123456',
      mileage_in: 120000,
      client_id: 7,
    });
  });
});

describe('pendências mostradas na revisão', () => {
  it('só a placa e sem cliente → lista tudo', () => {
    const labels = pendingLabels(emptyClient, plateOnly, false);
    expect(labels).toContain('nome do cliente');
    expect(labels).toContain('telefone do cliente');
    expect(labels).toContain('marca');
    expect(labels).toContain('KM de entrada');
  });

  it('cliente já cadastrado escolhido → não cobra dados de cliente', () => {
    const labels = pendingLabels(emptyClient, plateOnly, true);
    expect(labels.some((l) => l.includes('cliente'))).toBe(false);
  });

  it('tudo preenchido → nada pendente', () => {
    const labels = pendingLabels(
      { name: 'Ana', phone: '+5514997951011', cpf: '52998224725', email: '', address: 'Rua A' },
      {
        plate: 'ABC1D23',
        brand: 'Fiat',
        model: 'Uno',
        year: '2008',
        fuelType: 'flex',
        color: 'Branco',
        chassis: '9BD15822A8Y123456',
        mileageIn: '120000',
      },
      false,
    );
    expect(labels).toEqual([]);
  });
});
