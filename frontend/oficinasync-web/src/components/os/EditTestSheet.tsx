import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { apiFetch } from "@/lib/api";
import { GenericTestForm } from "./GenericTestForm";
import type { TestItem } from "./types";

type EditTestSheetProps = {
  test: TestItem | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

/** Edição de teste genérico (os especializados são criar/excluir por ora). */
export function EditTestSheet({ test, onClose, onSaved }: EditTestSheetProps) {
  const [saving, setSaving] = useState(false);

  return (
    <Sheet open={test !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Editar teste</SheetTitle>
          <SheetDescription>Ajuste as medições ou o veredito.</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8">
          {test && (
            <GenericTestForm
              key={test.test_id}
              initial={test}
              saving={saving}
              onCancel={onClose}
              onSave={async (p) => {
                if (!p.title.trim()) {
                  toast.error("O teste precisa de um título.");
                  return;
                }

                try {
                  setSaving(true);
                  await apiFetch(`/tests/${test.test_id}`, {
                    method: "PATCH",
                    json: {
                      title: p.title.trim(),
                      measurements: p.measurements,
                      verdict: p.verdict || undefined,
                      notes: p.notes.trim() || undefined,
                    },
                  });
                  toast.success("Teste atualizado!");
                  onClose();
                  await onSaved();
                } catch {
                  // apiFetch já mostrou o toast de erro
                } finally {
                  setSaving(false);
                }
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
