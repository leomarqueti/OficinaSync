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
import { BateriaForm } from "@/components/tests/BateriaForm";
import { LeituraDtcForm } from "@/components/tests/LeituraDtcForm";
import { CompressaoMecanicaForm } from "@/components/tests/CompressaoMecanicaForm";
import { InjetoresBancoForm } from "@/components/tests/InjetoresBancoForm";
import { AntesDepoisForm } from "@/components/tests/AntesDepoisForm";
import { hydrateSpecializedData, testTypeLabels } from "@/components/tests/testTypes";
import type { MediaItem, TestItem } from "./types";

type EditTestSheetProps = {
  test: TestItem | null;
  sectionId: number | null;
  sectionMedias: MediaItem[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type SpecializedPayload = {
  title: string;
  data: object;
  verdict: string;
  notes: string;
};

/** Edição de qualquer teste já salvo — genérico ou especializado (dispatcha pelo test_type). */
export function EditTestSheet({ test, sectionId, sectionMedias, onClose, onSaved }: EditTestSheetProps) {
  const [saving, setSaving] = useState(false);

  const saveSpecialized = async (payload: SpecializedPayload) => {
    if (!test) return;

    if (!payload.title.trim()) {
      toast.error("O teste precisa de um título.");
      return;
    }

    try {
      setSaving(true);
      await apiFetch(`/tests/${test.test_id}`, {
        method: "PATCH",
        json: {
          title: payload.title.trim(),
          data: payload.data,
          verdict: payload.verdict || undefined,
          notes: payload.notes.trim() || undefined,
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
  };

  const hydratedInitial =
    test && test.test_type && test.data
      ? {
          title: test.title,
          data: hydrateSpecializedData(test.test_type, test.data, sectionMedias),
          verdict: test.verdict ?? "",
          notes: test.notes ?? "",
        }
      : null;

  return (
    <Sheet open={test !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>
            {test?.test_type ? `Editar ${testTypeLabels[test.test_type]}` : "Editar teste"}
          </SheetTitle>
          <SheetDescription>Ajuste as medições ou o veredito.</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8">
          {test && !test.test_type && (
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

          {test && test.test_type === "bateria" && hydratedInitial && (
            <BateriaForm
              key={test.test_id}
              initial={hydratedInitial as any}
              saving={saving}
              onCancel={onClose}
              onSave={saveSpecialized}
            />
          )}

          {test && test.test_type === "leitura_dtc" && hydratedInitial && (
            <LeituraDtcForm
              key={test.test_id}
              initial={hydratedInitial as any}
              saving={saving}
              onCancel={onClose}
              onSave={saveSpecialized}
            />
          )}

          {test && test.test_type === "compressao_mecanica" && hydratedInitial && sectionId !== null && (
            <CompressaoMecanicaForm
              key={test.test_id}
              sectionId={sectionId}
              initial={hydratedInitial as any}
              saving={saving}
              onCancel={onClose}
              onSave={saveSpecialized}
            />
          )}

          {test && test.test_type === "injetores_banco" && hydratedInitial && sectionId !== null && (
            <InjetoresBancoForm
              key={test.test_id}
              sectionId={sectionId}
              initial={hydratedInitial as any}
              saving={saving}
              onCancel={onClose}
              onSave={saveSpecialized}
            />
          )}

          {test && test.test_type === "antes_depois" && hydratedInitial && sectionId !== null && (
            <AntesDepoisForm
              key={test.test_id}
              sectionId={sectionId}
              initial={hydratedInitial as any}
              saving={saving}
              onCancel={onClose}
              onSave={saveSpecialized}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
