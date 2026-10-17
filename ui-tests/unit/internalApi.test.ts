import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  formatQty,
  partLineText,
  sheetToText,
  type OfficeSheet,
} from '../../frontend/oficinasync-web/src/lib/internalApi';

describe('formatMoney / formatQty', () => {
  it('moeda em pt-BR; null vira "preço não informado"', () => {
    expect(formatMoney(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50');
    expect(formatMoney(0).replace(/\s/g, ' ')).toBe('R$ 0,00');
    expect(formatMoney(null)).toBe('preço não informado');
  });

  it('quantidade sem casas desnecessárias', () => {
    expect(formatQty(2)).toBe('2');
    expect(formatQty(1.5)).toBe('1,5');
  });
});

describe('partLineText', () => {
  it('descrição, código ou "sem código", e preço', () => {
    expect(
      partLineText({ description: 'Vela NGK', code: 'BKR6E', used_quantity: 2, unit_price: 25, line_total: 50 } as never),
    ).toMatch(/2x Vela NGK \| cód: BKR6E \| R\$\s?25,00 \(un\) = R\$\s?50,00/);
    expect(
      partLineText({ description: 'Filtro', code: null, used_quantity: 1, unit_price: null, line_total: null } as never),
    ).toBe('1x Filtro | sem código | preço não informado');
  });
});

const sheet: OfficeSheet = {
  service_order_id: 12,
  status: 'done',
  created_at: '2026-10-10T12:00:00Z',
  finished_at: '2026-10-11T12:00:00Z',
  complaint: 'Não pega de manhã',
  mileage_in: 120000,
  client: { name: 'Sr. Antônio', phone: '+5514997951011', cpf: '52998224725', address: 'Rua A, 1', email: null },
  car: { plate: 'ABC1D23', brand: 'Fiat', model: 'Uno', year: 2008, color: 'Branco', chassis: '9BD15822A8Y123456', fuel_type: 'flex' },
  missing_data: { client: [], car: [] },
  work_done: [{ type: 'repair', status: 'published', notes: 'Trocada a bomba' }],
  parts: [{ part_id: 1, description: 'Vela NGK', code: 'BKR6E', taken_quantity: 4, used_quantity: 2, unit_price: 25, photo_url: null, created_by_name: null, line_total: 50 }],
  pending_parts: [{ part_id: 2, description: 'Cabo', code: null, taken_quantity: 6, used_quantity: null, unit_price: null, photo_url: null, created_by_name: null }],
  services: [{ service_id: 1, description: 'Troca da bomba', price: 80 }],
  responsible: { user_id: 1, name: 'João', share_percent: 70 },
  participants: [{ user_id: 2, name: 'Pedro', share_percent: 30, task: 'diagnóstico' }],
  internal_notes: 'Paga no PIX',
  totals: { parts_total: 50, services_total: 80, grand_total: 130, unpriced_items: 0 },
};

describe('sheetToText', () => {
  const text = sheetToText(sheet);

  it('inclui OS, placa, cliente, peças usadas, retiradas sem acerto, serviços, equipe e anotações', () => {
    expect(text).toContain('OS #12');
    expect(text).toContain('ABC1D23');
    expect(text).toContain('Sr. Antônio');
    expect(text).toContain('PEÇAS USADAS');
    expect(text).toContain('2x Vela NGK');
    expect(text).toContain('RETIRADAS SEM ACERTO');
    expect(text).toContain('6x Cabo');
    expect(text).toContain('SERVIÇOS');
    expect(text).toContain('Troca da bomba');
    expect(text).toContain('João (responsável) 70%');
    expect(text).toContain('Pedro 30% — diagnóstico');
    expect(text).toContain('Paga no PIX');
  });

  it('não escreve "null" nem "undefined"; cliente ausente vira "Cliente não identificado"', () => {
    const bare = sheetToText({ ...sheet, client: null, internal_notes: null, parts: [], pending_parts: [], services: [], participants: [] });
    expect(bare).not.toMatch(/\bnull\b|\bundefined\b/);
    expect(bare).toContain('Cliente não identificado');
  });
});
