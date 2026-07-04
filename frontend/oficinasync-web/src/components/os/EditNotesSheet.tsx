import { useEffect, useState } from "react";
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
import type { SectionItem } from "./types";
import { sectionLabels } from "./types";

type EditNotesSheetProps = {
  section: SectionItem | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

/** Edita a explicação (notes) de uma etapa. */
export function EditNotesSheet({ section, onClose, onSaved }: EditNotesSheetProps) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(section?.notes ?? "");
  }, [section]);

  const submit = async () => {
    if (!section) return;

    try {
      setSaving(true);
      await apiFetch(`/sections/${section.section_id}`, {
        method: "PATCH",
        json: { notes },
      });
      toast.success("Texto da etapa atualizado!");
      onClose();
      await onSaved();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={section !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>
            Editar texto — {section ? sectionLabels[section.type] : ""}
          </SheetTitle>
          <SheetDescription>
            Explique com suas palavras o que foi visto ou feito. O cliente lê isso.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descreva o que foi analisado ou realizado nesta etapa..."
            className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
          />

          <div className="flex gap-2">
            <Button
              className="h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={submit}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvando..." : "Salvar texto"}
            </Button>
            <Button className="h-11" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
