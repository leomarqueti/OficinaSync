import { responsibleShare } from './internal-access';

const round2 = (n: number) => Math.round(n * 100) / 100;

type PartLike = { used_quantity: number | null; unit_price: number | null };
type ServiceLike = { price: number | null };

/** Total da linha da peça; null quando não dá pra calcular (sem acerto ou sem preço). */
export function lineTotal(part: PartLike): number | null {
  if (part.used_quantity === null || part.unit_price === null) return null;
  return round2(part.used_quantity * part.unit_price);
}

export function itemTotals(parts: PartLike[], services: ServiceLike[]) {
  const settled = parts.filter((p) => p.used_quantity !== null);
  const partsTotal = round2(
    settled.reduce((acc, p) => acc + (lineTotal(p) ?? 0), 0),
  );
  const servicesTotal = round2(
    services.reduce((acc, s) => acc + (s.price ?? 0), 0),
  );
  const unpriced =
    settled.filter((p) => p.unit_price === null).length +
    services.filter((s) => s.price === null).length;

  return {
    parts_total: partsTotal,
    services_total: servicesTotal,
    grand_total: round2(partsTotal + servicesTotal),
    unpriced_items: unpriced,
  };
}

export type CommissionOrder = {
  service_order_id: number;
  plate: string;
  finished_at: Date;
  responsible_id: number;
  responsible_name: string;
  responsible_role: string;
  participants: { user_id: number; name: string; role: string; share_percent: number; task: string }[];
};

export type CommissionLine = {
  service_order_id: number;
  plate: string;
  finished_at: Date;
  share_percent: number;
  task: string | null;
  is_responsible: boolean;
};

export type CommissionPerson = {
  user_id: number;
  name: string;
  role: string;
  os_count: number;
  total_percent: number;
  orders: CommissionLine[];
};

export function commissionTotals(orders: CommissionOrder[]): CommissionPerson[] {
  const byUser = new Map<number, CommissionPerson>();
  const person = (id: number, name: string, role: string) => {
    let p = byUser.get(id);
    if (!p) {
      p = { user_id: id, name, role, os_count: 0, total_percent: 0, orders: [] };
      byUser.set(id, p);
    }
    return p;
  };
  const add = (p: CommissionPerson, line: CommissionLine) => {
    p.orders.push(line);
    p.os_count += 1;
    p.total_percent += line.share_percent;
  };

  for (const o of orders) {
    const base = { service_order_id: o.service_order_id, plate: o.plate, finished_at: o.finished_at };
    add(person(o.responsible_id, o.responsible_name, o.responsible_role), {
      ...base,
      share_percent: responsibleShare(o.participants.map((x) => x.share_percent)),
      task: null,
      is_responsible: true,
    });
    for (const x of o.participants) {
      add(person(x.user_id, x.name, x.role), { ...base, share_percent: x.share_percent, task: x.task, is_responsible: false });
    }
  }

  return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
