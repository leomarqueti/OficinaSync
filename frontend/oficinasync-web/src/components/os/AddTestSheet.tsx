import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TestTypeSelector } from "@/components/tests/TestTypeSelector";
import { BateriaForm } from "@/components/tests/BateriaForm";
import { LeituraDtcForm } from "@/components/tests/LeituraDtcForm";
import { CompressaoMecanicaForm } from "@/components/tests/CompressaoMecanicaForm";
import { InjetoresBancoForm } from "@/components/tests/InjetoresBancoForm";
import { AntesDepoisForm } from "@/components/tests/AntesDepoisForm";
import type { TestTypeCategory } from "@/components/tests/testTypes";
import { testTypeLabels } from "@/components/tests/testTypes";
import { apiFetch } from "@/lib/api";
import { GenericTestForm } from "./GenericTestForm";

type AddTestSheetProps = {
  /** Section alvo; null = sheet fechado. */
  sectionId: number | null;
  /** Veículo da OS atual — habilita o painel de histórico entre visitas no teste genérico. */
  carId: number;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type SpecializedPayload = {
  title: string;
  data: object;
  verdict: string;
  notes: string;
};

/** Fluxo de registrar um teste: escolhe o tipo → formulário certo → salva. */
export function AddTestSheet({ sectionId, carId, onClose, onSaved }: AddTestSheetProps) {
  const [chosen, setChosen] = useState<TestTypeCategory | "generic" | null>(null);
  const [saving, setSaving] = useState(false);

  const open = sectionId !== null;

  const close = () => {
    setChosen(null);
    onClose();
  };

  const save = async (body: Record<string, unknown>, title: string) => {
    if (!title.trim()) {
      toast.error("Dê um título pro teste antes de salvar.");
      return;
    }

    try {
      setSaving(true);
      await apiFetch("/tests", { method: "POST", json: body });
      toast.success("Teste registrado!");
      setChosen(null);
      onClose();
      await onSaved();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSaving(false);
    }
  };

  const saveSpecialized = (type: TestTypeCategory) => (payload: SpecializedPayload) =>
    save(
      {
        section_id: sectionId,
        title: payload.title.trim(),
        test_type: type,
        data: payload.data,
        verdict: payload.verdict || undefined,
        notes: payload.notes.trim() || undefined,
      },
      payload.title,
    );

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>
            {chosen === null
              ? "Registrar teste"
              : chosen === "generic"
                ? "Teste personalizado"
                : testTypeLabels[chosen]}
          </SheetTitle>
          <SheetDescription>
            {chosen === null
              ? "O teste vira prova técnica no laudo e na página do cliente."
              : "Preencha o que você mediu — os campos em branco ficam de fora."}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-8">
          {chosen === null && <TestTypeSelector onSelect={setChosen} />}

          {chosen === "generic" && (
            <GenericTestForm
              carId={carId}
              saving={saving}
              onCancel={close}
              onSave={(p) =>
                save(
                  {
                    section_id: sectionId,
                    title: p.title.trim(),
                    measurements: p.measurements,
                    verdict: p.verdict || undefined,
                    notes: p.notes.trim() || undefined,
                  },
                  p.title,
                )
              }
            />
          )}

          {chosen === "bateria" && (
            <BateriaForm saving={saving} onCancel={close} onSave={saveSpecialized("bateria")} />
          )}

          {chosen === "leitura_dtc" && (
            <LeituraDtcForm
              saving={saving}
              onCancel={close}
              onSave={saveSpecialized("leitura_dtc")}
            />
          )}

          {chosen === "compressao_mecanica" && sectionId !== null && (
            <CompressaoMecanicaForm
              sectionId={sectionId}
              saving={saving}
              onCancel={close}
              onSave={saveSpecialized("compressao_mecanica")}
            />
          )}

          {chosen === "injetores_banco" && sectionId !== null && (
            <InjetoresBancoForm
              sectionId={sectionId}
              saving={saving}
              onCancel={close}
              onSave={saveSpecialized("injetores_banco")}
            />
          )}

          {chosen === "antes_depois" && sectionId !== null && (
            <AntesDepoisForm
              sectionId={sectionId}
              saving={saving}
              onCancel={close}
              onSave={saveSpecialized("antes_depois")}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
