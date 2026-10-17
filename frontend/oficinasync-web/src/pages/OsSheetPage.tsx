import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { carTitle, clientLabel } from "@/lib/display";
import { formatMoney, formatQty, partLineText, sheetToText, type OfficeSheet } from "@/lib/internalApi";

async function copy(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Não consegui copiar. Selecione o texto e copie manualmente.");
  }
}

function Block({ title, copyText, children }: { title: string; copyText?: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid space-y-2 rounded-2xl border border-neutral-300 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-700">{title}</h2>
        {copyText !== undefined && (
          <button
            type="button"
            onClick={() => copy(copyText, `${title}: copiado!`)}
            className="no-print flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar
          </button>
        )}
      </div>
      <div className="space-y-1 text-sm text-neutral-900">{children}</div>
    </section>
  );
}

export function OsSheetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<OfficeSheet | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setSheet(await apiFetch<OfficeSheet>(`/service_orders/${id}/office-sheet`, { silent: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a ficha.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 p-6 text-neutral-900">
        <p>{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(`/os/${id}`)}>Voltar</Button>
      </div>
    );
  }
  if (!sheet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const partsText = sheet.parts.map((p) => partLineText(p)).join("\n");
  const servicesText = sheet.services.map((s) => `${s.description} | ${formatMoney(s.price)}`).join("\n");
  const teamText = [
    `${sheet.responsible.name} (responsável) ${sheet.responsible.share_percent}%`,
    ...sheet.participants.map((p) => `${p.name} ${p.share_percent}% — ${p.task}`),
  ].join("\n");

  return (
    <div className="min-h-screen bg-neutral-100 p-4 text-neutral-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => navigate(`/os/${sheet.service_order_id}`)} className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" /> Voltar para a OS
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => copy(sheetToText(sheet), "Ficha copiada!")}>
              <Copy className="mr-1.5 h-4 w-4" /> Copiar tudo
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir / Salvar PDF
            </Button>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Ficha da OS #{sheet.service_order_id}</h1>
        <p className="text-xs text-neutral-500">Documento interno — não é enviado ao cliente.</p>

        {(sheet.missing_data.client.length > 0 || sheet.missing_data.car.length > 0) && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Dados pendentes: {[...sheet.missing_data.client, ...sheet.missing_data.car].map((i) => i.label).join(", ")}.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Block title="Cliente">
            <p className="font-medium">{clientLabel(sheet.client?.name)}</p>
            {sheet.client?.phone && <p>{sheet.client.phone}</p>}
            {sheet.client?.cpf && <p>CPF {sheet.client.cpf}</p>}
            {sheet.client?.address && <p>{sheet.client.address}</p>}
            {sheet.client?.email && <p>{sheet.client.email}</p>}
          </Block>
          <Block title="Veículo">
            <p className="font-medium">
              {carTitle(sheet.car)} {sheet.car.year ?? ""}
            </p>
            <p className="font-mono">{sheet.car.plate}</p>
            {sheet.car.chassis && <p>Chassi {sheet.car.chassis}</p>}
            <p>{[sheet.car.color, sheet.car.fuel_type, sheet.mileage_in != null ? `${sheet.mileage_in.toLocaleString("pt-BR")} km` : null].filter(Boolean).join(" · ")}</p>
          </Block>
        </div>

        <Block title="Defeito relatado e o que foi feito">
          <p>{sheet.complaint}</p>
          {sheet.work_done.map((w, i) => (
            <p key={i} className="text-neutral-700">— {w.notes}</p>
          ))}
        </Block>

        <Block title="Peças usadas" copyText={partsText}>
          {sheet.parts.length === 0 && <p className="text-neutral-500">Nenhuma peça acertada.</p>}
          {sheet.parts.map((p) => (
            <div key={p.part_id} className="flex flex-wrap items-center gap-3 border-b border-neutral-100 py-1">
              <span className="flex-1">{partLineText(p)}</span>
              {p.photo_url && <img src={p.photo_url} alt={`Caixa de ${p.description}`} className="h-14 rounded border border-neutral-200 object-cover" />}
            </div>
          ))}
        </Block>

        {sheet.pending_parts.length > 0 && (
          <Block title="Retiradas sem acerto">
            {sheet.pending_parts.map((p) => (
              <div key={p.part_id} className="flex items-center gap-3 text-amber-800">
                <span className="flex-1">
                  {formatQty(p.taken_quantity)}x {p.description} | {p.code ? `cód: ${p.code}` : "sem código"}
                </span>
                {p.photo_url && <img src={p.photo_url} alt={`Caixa de ${p.description}`} className="h-14 rounded border border-neutral-200 object-cover" />}
              </div>
            ))}
          </Block>
        )}

        <Block title="Serviços / mão de obra" copyText={servicesText}>
          {sheet.services.length === 0 && <p className="text-neutral-500">Nenhum serviço anotado.</p>}
          {sheet.services.map((s) => (
            <p key={s.service_id}>{s.description} — {formatMoney(s.price)}</p>
          ))}
        </Block>

        <Block title="Equipe e porcentagens" copyText={teamText}>
          <p>{sheet.responsible.name} (responsável): <strong>{sheet.responsible.share_percent}%</strong></p>
          {sheet.participants.map((p) => (
            <p key={p.user_id}>{p.name}: <strong>{p.share_percent}%</strong> — {p.task}</p>
          ))}
        </Block>

        {sheet.internal_notes && (
          <Block title="Anotações do escritório" copyText={sheet.internal_notes}>
            <p className="whitespace-pre-line">{sheet.internal_notes}</p>
          </Block>
        )}

        <Block title="Totais">
          <p>Peças: {formatMoney(sheet.totals.parts_total)} · Serviços: {formatMoney(sheet.totals.services_total)}</p>
          <p className="text-base font-bold">Total: {formatMoney(sheet.totals.grand_total)}</p>
          {sheet.totals.unpriced_items > 0 && <p className="text-amber-800">{sheet.totals.unpriced_items} item(ns) sem preço — o total não os inclui.</p>}
        </Block>
      </div>
    </div>
  );
}
