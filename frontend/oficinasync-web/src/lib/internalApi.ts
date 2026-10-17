import { clientLabel } from "./display";
import type { MissingData } from "@/components/os/types";

export type Perm = {
  edit_items: boolean;
  edit_team: boolean;
  edit_notes: boolean;
  change_responsible: boolean;
  see_sheet: boolean;
  see_all_team: boolean;
};

export type PartView = {
  part_id: number;
  description: string;
  code: string | null;
  taken_quantity: number;
  used_quantity: number | null;
  unit_price: number | null;
  photo_url: string | null;
  created_by_name: string | null;
};

export type ServiceView = { service_id: number; description: string; price: number | null };
export type ParticipantView = { user_id: number; name: string; share_percent: number; task: string };
export type TeamMember = { user_id: number; name: string; role: "owner" | "mechanic" | "receptionist" };

export type InternalData = {
  service_order_id: number;
  status: string;
  viewer: { user_id: number; role: TeamMember["role"]; is_responsible: boolean };
  responsible: { user_id: number; name: string };
  notes: string | null;
  parts: PartView[];
  services: ServiceView[];
  participants: ParticipantView[];
  responsible_share_percent: number | null;
  my_share_percent: number | null;
  can: Perm;
};

export type OfficeSheet = {
  service_order_id: number;
  status: string;
  created_at: string;
  finished_at: string | null;
  complaint: string;
  mileage_in: number | null;
  client: { name: string; phone: string | null; cpf: string | null; address: string | null; email: string | null } | null;
  car: {
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    chassis: string | null;
    fuel_type: string | null;
  };
  missing_data: MissingData;
  work_done: { type: string; status: string; notes: string }[];
  parts: (PartView & { line_total: number | null })[];
  pending_parts: PartView[];
  services: ServiceView[];
  responsible: { user_id: number; name: string; share_percent: number };
  participants: ParticipantView[];
  internal_notes: string | null;
  totals: { parts_total: number; services_total: number; grand_total: number; unpriced_items: number };
};

export function formatMoney(value: number | null): string {
  if (value === null) return "preço não informado";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatQty(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** "2x Vela NGK | cód: BKR6E | R$ 25,00 (un) = R$ 50,00" */
export function partLineText(
  p: Pick<PartView, "description" | "code" | "used_quantity" | "unit_price"> & {
    line_total: number | null;
    taken_quantity?: number;
  },
): string {
  const qty = p.used_quantity ?? p.taken_quantity ?? 0;
  const parts = [`${formatQty(qty)}x ${p.description}`, p.code ? `cód: ${p.code}` : "sem código"];
  if (p.unit_price === null) {
    parts.push("preço não informado");
  } else {
    parts.push(
      p.line_total !== null
        ? `${formatMoney(p.unit_price)} (un) = ${formatMoney(p.line_total)}`
        : `${formatMoney(p.unit_price)} (un)`,
    );
  }
  return parts.join(" | ");
}

/** Texto puro da ficha, pronto pra colar no outro sistema. */
export function sheetToText(s: OfficeSheet): string {
  const lines: string[] = [];
  const carName = [s.car.brand, s.car.model, s.car.year].filter(Boolean).join(" ");
  lines.push(`OS #${s.service_order_id} — ${s.car.plate}${carName ? ` — ${carName}` : ""}`);
  lines.push("");
  lines.push("CLIENTE");
  lines.push(clientLabel(s.client?.name));
  if (s.client) {
    for (const v of [s.client.phone, s.client.cpf && `CPF ${s.client.cpf}`, s.client.address, s.client.email]) {
      if (v) lines.push(v);
    }
  }
  lines.push("");
  lines.push("DEFEITO RELATADO");
  lines.push(s.complaint);
  if (s.work_done.length > 0) {
    lines.push("");
    lines.push("O QUE FOI FEITO");
    for (const w of s.work_done) lines.push(`- ${w.notes}`);
  }

  lines.push("");
  lines.push("PEÇAS USADAS");
  if (s.parts.length === 0) lines.push("(nenhuma)");
  for (const p of s.parts) lines.push(`- ${partLineText(p)}`);

  if (s.pending_parts.length > 0) {
    lines.push("");
    lines.push("RETIRADAS SEM ACERTO");
    for (const p of s.pending_parts) {
      lines.push(`- ${formatQty(p.taken_quantity)}x ${p.description} | ${p.code ? `cód: ${p.code}` : "sem código"}`);
    }
  }

  lines.push("");
  lines.push("SERVIÇOS");
  if (s.services.length === 0) lines.push("(nenhum)");
  for (const v of s.services) lines.push(`- ${v.description} | ${formatMoney(v.price)}`);

  lines.push("");
  lines.push("EQUIPE");
  lines.push(`- ${s.responsible.name} (responsável) ${s.responsible.share_percent}%`);
  for (const p of s.participants) lines.push(`- ${p.name} ${p.share_percent}% — ${p.task}`);

  if (s.internal_notes) {
    lines.push("");
    lines.push("ANOTAÇÕES DO ESCRITÓRIO");
    lines.push(s.internal_notes);
  }

  lines.push("");
  lines.push(
    `TOTAL: peças ${formatMoney(s.totals.parts_total)} + serviços ${formatMoney(s.totals.services_total)} = ${formatMoney(s.totals.grand_total)}` +
      (s.totals.unpriced_items > 0 ? ` (${s.totals.unpriced_items} item(ns) sem preço)` : ""),
  );
  return lines.join("\n");
}
