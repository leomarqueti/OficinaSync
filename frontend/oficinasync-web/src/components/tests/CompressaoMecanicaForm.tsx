import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhotoCaptureButton } from "./PhotoCaptureButton";
import { TestFormShell } from "./TestFormShell";
import type { CompressaoCylinder, CompressaoMecanicaData, ItemStatus } from "./testTypes";
import { emptyCompressaoData, testTypeLabels } from "./testTypes";

type CompressaoMecanicaFormProps = {
  sectionId: number;
  initial?: { title: string; data: CompressaoMecanicaData; verdict: string; notes: string };
  onSave: (payload: {
    title: string;
    data: CompressaoMecanicaData;
    verdict: string;
    notes: string;
  }) => void;
  onCancel: () => void;
  saving: boolean;
};

export function CompressaoMecanicaForm({
  sectionId,
  initial,
  onSave,
  onCancel,
  saving,
}: CompressaoMecanicaFormProps) {
  const [title, setTitle] = useState(initial?.title ?? testTypeLabels.compressao_mecanica);
  const [data, setData] = useState<CompressaoMecanicaData>(initial?.data ?? emptyCompressaoData());
  const [verdict, setVerdict] = useState(initial?.verdict ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const updateCylinder = (
    index: number,
    field: keyof CompressaoCylinder,
    value: string | number | null,
  ) => {
    setData((prev) => ({
      ...prev,
      cylinders: prev.cylinders.map((cyl, i) =>
        i === index ? { ...cyl, [field]: value } : cyl,
      ),
    }));
  };

  const addCylinder = () => {
    setData((prev) => ({
      ...prev,
      cylinders: [
        ...prev.cylinders,
        {
          number: prev.cylinders.length + 1,
          value: "",
          media_id: null,
          previewUrl: null,
          status: "",
        },
      ],
    }));
  };

  const removeCylinder = (index: number) => {
    setData((prev) => ({
      ...prev,
      cylinders: prev.cylinders.filter((_, i) => i !== index),
    }));
  };

  return (
    <TestFormShell
      title={title}
      onTitleChange={setTitle}
      verdict={verdict}
      onVerdictChange={setVerdict}
      notes={notes}
      onNotesChange={setNotes}
      onSave={() => onSave({ title, data, verdict, notes })}
      onCancel={onCancel}
      saving={saving}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Ferramenta</label>
            <input
              type="text"
              value={data.tool}
              onChange={(e) => setData((prev) => ({ ...prev, tool: e.target.value }))}
              placeholder="Ex: Würth, Kitest"
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Unidade</label>
            <select
              value={data.unit}
              onChange={(e) =>
                setData((prev) => ({ ...prev, unit: e.target.value as typeof prev.unit }))
              }
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="psi">psi</option>
              <option value="bar">bar</option>
              <option value="kgf">kgf</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mín. especificado</label>
              <input
                type="number"
                inputMode="decimal"
                value={data.specMin}
                onChange={(e) => setData((prev) => ({ ...prev, specMin: e.target.value }))}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Máx. especificado</label>
              <input
                type="number"
                inputMode="decimal"
                value={data.specMax}
                onChange={(e) => setData((prev) => ({ ...prev, specMax: e.target.value }))}
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Cilindros</label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.cylinders.map((cyl, index) => (
              <div key={index} className="space-y-2 rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Cilindro {cyl.number}</span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeCylinder(index)}
                  >
                    Remover
                  </Button>
                </div>

                <div className="flex gap-3">
                  <PhotoCaptureButton
                    sectionId={sectionId}
                    label="Foto"
                    mediaLabel={`Compressão - Cilindro ${cyl.number}`}
                    previewUrl={cyl.previewUrl}
                    onUploaded={(mediaId, previewUrl) => {
                      updateCylinder(index, "media_id", mediaId);
                      updateCylinder(index, "previewUrl", previewUrl);
                    }}
                  />

                  <div className="flex flex-1 flex-col gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={cyl.value}
                      onChange={(e) => updateCylinder(index, "value", e.target.value)}
                      placeholder={`Valor (${data.unit})`}
                      className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <select
                      value={cyl.status}
                      onChange={(e) =>
                        updateCylinder(index, "status", e.target.value as ItemStatus | "")
                      }
                      className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Status</option>
                      <option value="approved">OK</option>
                      <option value="inconclusive">Atenção</option>
                      <option value="failed">Crítico</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addCylinder}>
            + Adicionar cilindro
          </Button>
        </div>
      </div>
    </TestFormShell>
  );
}
