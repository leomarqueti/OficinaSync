import { orderClient } from './order-client';

describe('cliente da OS (quem trouxe o carro nessa visita)', () => {
  const x = { client_id: 1, name: 'X' } as never;
  const y = { client_id: 2, name: 'Y' } as never;

  it('usa o cliente da própria OS quando existe', () => {
    expect(orderClient({ client: y, car: { client: x } })).toBe(y);
  });

  it('cai pro dono do carro quando a OS não tem cliente (OS antiga)', () => {
    expect(orderClient({ client: null, car: { client: x } })).toBe(x);
  });

  it('sem nenhum dos dois devolve null', () => {
    expect(orderClient({ client: null, car: { client: null } })).toBeNull();
    expect(orderClient({})).toBeNull();
  });
});
