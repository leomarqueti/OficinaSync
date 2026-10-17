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
