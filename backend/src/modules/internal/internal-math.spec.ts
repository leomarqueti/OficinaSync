import { itemTotals, lineTotal } from './internal-math';

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
