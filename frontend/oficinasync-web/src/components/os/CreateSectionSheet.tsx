import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { sectionLabels } from "./types";

type CreateSectionSheetProps = {
  serviceOrderId: number;
  /** Tipo da etapa a criar; null = fechado. */
  sectionType: string | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

/** Cria uma etapa que ainda não existe na OS (vinda do stepper). */
export function CreateSectionSheet({
  serviceOrderId,
  sectionType,
  onClose,
  onSaved,
}: CreateSectionSheetProps) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => {
    setNotes("");
    onClose();
  };

  const submit = async () => {
    try {
      setSaving(true);
      await apiFetch("/sections", {
        method: "POST",
        json: {
          service_order_id: serviceOrderId,
          type: sectionType,
          notes: notes.trim() || null,
        },
      });
      toast.success(`Etapa "${sectionLabels[sectionType ?? ""]}" criada!`);
      close();
      await onSaved();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={sectionType !== null} onOpenChange={(o) => !o && close()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>
            Nova etapa: {sectionType ? sectionLabels[sectionType] : ""}
          </SheetTitle>
          <SheetDescription>
            A etapa nasce como rascunho — o cliente só vê depois que você publicar.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações iniciais (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: iniciando a desmontagem do coletor..."
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              className="h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={submit}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Criando..." : "Criar etapa"}
            </Button>
            <Button className="h-11" variant="outline" onClick={close}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
