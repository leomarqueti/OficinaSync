import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FieldShell } from "@/components/fields/FieldShell";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/imageCompression";
import { parseMoneyBR } from "@/lib/money";
import { useDarkTheme } from "@/hooks/useDarkTheme";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type PartSheetProps = {
  orderId: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

/** Registra uma peça retirada do estoque (com foto da caixa, código opcional e preço opcional). */
export function PartSheet({ orderId, open, onClose, onSaved }: PartSheetProps) {
  useDarkTheme();
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescription("");
    setCode("");
    setQty("");
    setPrice("");
    setPhoto(null);
  }, [open]);

  const qtyValue = parseMoneyBR(qty);
  const priceValue = price.trim() === "" ? null : parseMoneyBR(price);
  const priceInvalid = price.trim() !== "" && priceValue === null;
  const valid = description.trim().length > 0 && qtyValue !== null && !priceInvalid;

  const submit = async () => {
    try {
      setSaving(true);
      const part = await apiFetch<{ part_id: number }>(`/service_orders/${orderId}/parts`, {
        method: "POST",
        json: {
          description: description.trim(),
          ...(code.trim() ? { code: code.trim() } : {}),
          taken_quantity: qtyValue,
          ...(priceValue !== null ? { unit_price: priceValue } : {}),
        },
      });

      if (photo) {
        const formData = new FormData();
        formData.append("file", await compressImage(photo));
        await apiFetch(`/service_orders/${orderId}/parts/${part.part_id}/photo`, { method: "POST", body: formData });
      }

      toast.success("Peça registrada!");
      onClose();
      await onSaved();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Peça retirada do estoque</SheetTitle>
          <SheetDescription>
            Sem código? Tire uma foto da caixa. Depois, no final, você informa só o que realmente usou.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <FieldShell label="Descrição da peça" htmlFor="part-desc">
            <input id="part-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Vela de ignição NGK" className={inputClass} />
          </FieldShell>
          <FieldShell label="Código" htmlFor="part-code" optional>
            <input id="part-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: BKR6E" className={inputClass} />
          </FieldShell>
          <FieldShell label="Quantidade retirada" htmlFor="part-qty">
            <input id="part-qty" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Ex: 4" className={inputClass} />
          </FieldShell>
          <FieldShell label="Preço unitário (R$)" htmlFor="part-price" optional>
            <input id="part-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Deixe em branco se não souber" className={inputClass} />
          </FieldShell>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm">
            <Camera className="h-4 w-4" />
            <span>{photo ? photo.name : "Foto da caixa (opcional)"}</span>
            <input
              id="part-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="flex gap-2 pt-2">
            <Button className="h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand/90" disabled={!valid || saving} onClick={submit}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar peça
            </Button>
            <Button className="h-11" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
