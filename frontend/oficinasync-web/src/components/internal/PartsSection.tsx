import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/imageCompression";
import { parseMoneyBR } from "@/lib/money";
import { formatMoney, formatQty, type PartView } from "@/lib/internalApi";
import { HelpHint } from "@/components/guide/HelpHint";
import { PartSheet } from "./PartSheet";

type Props = {
  orderId: number;
  parts: PartView[];
  canEdit: boolean;
  onChanged: () => Promise<void> | void;
};

const inputClass =
  "h-10 w-24 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PartsSection({ orderId, parts, canEdit, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState<Record<number, string>>({});
  const [price, setPrice] = useState<Record<number, string>>({});

  const settle = async (part: PartView) => {
    const usedValue = used[part.part_id] ?? (part.used_quantity !== null ? String(part.used_quantity) : "");
    const usedNumber = parseMoneyBR(usedValue);
    if (usedNumber === null) {
      toast.error("Informe quanto você realmente usou (pode ser 0).");
      return;
    }
    const priceValue = price[part.part_id];
    const priceNumber = priceValue === undefined || priceValue.trim() === "" ? null : parseMoneyBR(priceValue);
    if (priceValue !== undefined && priceValue.trim() !== "" && priceNumber === null) {
      toast.error("Preço inválido. Use números, por exemplo 25 ou 1.200,50.");
      return;
    }
    try {
      await apiFetch(`/service_orders/${orderId}/parts/${part.part_id}`, {
        method: "PATCH",
        json: {
          used_quantity: usedNumber,
          ...(priceValue !== undefined ? { unit_price: priceNumber } : {}),
        },
      });
      toast.success("Acerto salvo!");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  const remove = async (part: PartView) => {
    try {
      await apiFetch(`/service_orders/${orderId}/parts/${part.part_id}`, { method: "DELETE" });
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  const addPhoto = async (part: PartView, file: File | null) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", await compressImage(file));
      await apiFetch(`/service_orders/${orderId}/parts/${part.part_id}/photo`, { method: "POST", body: formData });
      toast.success("Foto anexada!");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  const pending = parts.filter((p) => p.used_quantity === null).length;

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5" data-tour="parts">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Peças
          <HelpHint
            label="Ajuda: peças retiradas e usadas"
            text="Registre as peças que você pegou no estoque. No final, informe só o que você realmente usou — o escritório lança só o que foi usado. Sem código? Tire foto da caixa."
          />
        </h2>
        {canEdit && (
          <Button variant="outline" className="h-10" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar peça
          </Button>
        )}
      </div>

      {pending > 0 && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          {pending} peça(s) retirada(s) sem acerto — informe quanto realmente usou.
        </p>
      )}

      {parts.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma peça registrada ainda.</p>}

      <ul className="space-y-3">
        {parts.map((part) => (
          <li key={part.part_id} className="space-y-2 rounded-2xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{part.description}</p>
                <p className="text-xs text-muted-foreground">
                  {part.code ? `cód: ${part.code}` : "sem código"} · retiradas: {formatQty(part.taken_quantity)} ·{" "}
                  {formatMoney(part.unit_price)}
                  {part.created_by_name ? ` · ${part.created_by_name}` : ""}
                </p>
              </div>
              {canEdit && (
                <button type="button" aria-label={`Apagar ${part.description}`} onClick={() => remove(part)} className="text-muted-foreground hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {part.photo_url && (
              <img src={part.photo_url} alt={`Caixa de ${part.description}`} className="h-24 rounded-lg border border-border object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            )}

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={`Quantidade usada de ${part.description}`}
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="usada"
                  value={used[part.part_id] ?? (part.used_quantity !== null ? String(part.used_quantity) : "")}
                  onChange={(e) => setUsed((s) => ({ ...s, [part.part_id]: e.target.value }))}
                />
                <input
                  aria-label={`Preço unitário de ${part.description}`}
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="R$ un."
                  value={price[part.part_id] ?? (part.unit_price !== null ? String(part.unit_price) : "")}
                  onChange={(e) => setPrice((s) => ({ ...s, [part.part_id]: e.target.value }))}
                />
                <Button size="sm" className="h-10" onClick={() => settle(part)}>
                  Confirmar uso
                </Button>
                <label className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground">
                  <Camera className="h-4 w-4" />
                  Foto
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => addPhoto(part, e.target.files?.[0] ?? null)} />
                </label>
                {part.used_quantity !== null && <span className="text-xs text-brand">usada: {formatQty(part.used_quantity)}</span>}
              </div>
            )}
          </li>
        ))}
      </ul>

      <PartSheet orderId={orderId} open={open} onClose={() => setOpen(false)} onSaved={onChanged} />
    </section>
  );
}
