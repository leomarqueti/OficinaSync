import { commissionTotals, itemTotals, lineTotal } from './internal-math';

describe('lineTotal', () => {
  it('quantidade usada × preço unitário, com 2 casas', () => {
    expect(lineTotal({ used_quantity: 2, unit_price: 25.5 })).toBe(51);
    expect(lineTotal({ used_quantity: 3, unit_price: 0.1 })).toBe(0.3);
  });

  it('sem preço ou sem acerto → null (nunca 0)', () => {
    expect(lineTotal({ used_quantity: 2, unit_price: null })).toBeNull();
    expect(lineTotal({ used_quantity: null, unit_price: 10 })).toBeNull();
  });
});

describe('itemTotals', () => {
  it('soma só peças acertadas com preço e serviços com valor; conta o que está sem preço', () => {
    const totals = itemTotals(
      [
        { used_quantity: 2, unit_price: 25 },
        { used_quantity: 1, unit_price: null },
        { used_quantity: null, unit_price: 99 }, // sem acerto: fora da conta e fora do "sem preço"
      ],
      [{ price: 80 }, { price: null }],
    );
    expect(totals).toEqual({ parts_total: 50, services_total: 80, grand_total: 130, unpriced_items: 2 });
  });

  it('tudo vazio → zeros', () => {
    expect(itemTotals([], [])).toEqual({ parts_total: 0, services_total: 0, grand_total: 0, unpriced_items: 0 });
  });
});

describe('commissionTotals', () => {
  const finished = new Date('2026-10-10T12:00:00Z');
  const orders = [
    {
      service_order_id: 1, plate: 'AAA1A11', finished_at: finished,
      responsible_id: 10, responsible_name: 'João', responsible_role: 'mechanic',
      participants: [{ user_id: 20, name: 'Pedro', role: 'mechanic', share_percent: 30, task: 'diagnóstico' }],
    },
    {
      service_order_id: 2, plate: 'BBB2B22', finished_at: finished,
      responsible_id: 20, responsible_name: 'Pedro', responsible_role: 'mechanic',
      participants: [],
    },
  ];

  it('o responsável fica com o que sobra e cada pessoa soma suas porcentagens', () => {
    const people = commissionTotals(orders);
    const joao = people.find((p) => p.user_id === 10)!;
    const pedro = people.find((p) => p.user_id === 20)!;

    expect(joao.total_percent).toBe(70);
    expect(joao.os_count).toBe(1);
    expect(pedro.total_percent).toBe(130); // 30% da OS 1 + 100% da OS 2
    expect(pedro.os_count).toBe(2);
    expect(pedro.orders.find((o) => o.service_order_id === 1)).toMatchObject({ share_percent: 30, task: 'diagnóstico', is_responsible: false });
    expect(pedro.orders.find((o) => o.service_order_id === 2)).toMatchObject({ share_percent: 100, task: null, is_responsible: true });
  });

  it('sem OS → lista vazia', () => {
    expect(commissionTotals([])).toEqual([]);
  });
});
