import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatMoney, type ServiceView } from "@/lib/internalApi";

type Props = { orderId: number; services: ServiceView[]; canEdit: boolean; onChanged: () => Promise<void> | void };

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ServicesSection({ orderId, services, canEdit, onChanged }: Props) {
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const add = async () => {
    try {
      await apiFetch(`/service_orders/${orderId}/services`, {
        method: "POST",
        json: {
          description: description.trim(),
          ...(price !== "" ? { price: Number(price.replace(",", ".")) } : {}),
        },
      });
      setDescription("");
      setPrice("");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  const remove = async (id: number) => {
    try {
      await apiFetch(`/service_orders/${orderId}/services/${id}`, { method: "DELETE" });
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5" data-tour="services">
      <h2 className="text-lg font-semibold">Serviços feitos</h2>
      {services.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço anotado ainda.</p>}
      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s.service_id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
            <span>
              {s.description} <span className="text-muted-foreground">· {formatMoney(s.price)}</span>
            </span>
            {canEdit && (
              <button type="button" aria-label={`Apagar ${s.description}`} onClick={() => remove(s.service_id)} className="text-muted-foreground hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="service-desc" className="text-sm font-medium">Serviço</label>
            <input id="service-desc" className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Troca da bomba de combustível" />
          </div>
          <div className="w-32">
            <label htmlFor="service-price" className="text-sm font-medium">Valor <span className="text-xs text-muted-foreground">(opcional)</span></label>
            <input id="service-price" inputMode="decimal" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="R$" />
          </div>
          <Button className="h-11" onClick={add} disabled={description.trim() === ""}>
            Adicionar serviço
          </Button>
        </div>
      )}
    </section>
  );
}
