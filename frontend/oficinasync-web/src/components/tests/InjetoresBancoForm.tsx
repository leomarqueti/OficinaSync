import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhotoCaptureButton } from "./PhotoCaptureButton";
import { TestFormShell } from "./TestFormShell";
import type { InjetorItem, InjetoresBancoData, SprayPattern } from "./testTypes";
import { emptyInjetoresBancoData, testTypeLabels } from "./testTypes";

type InjetoresBancoFormProps = {
  sectionId: number;
  initial?: { title: string; data: InjetoresBancoData; verdict: string; notes: string };
  onSave: (payload: {
    title: string;
    data: InjetoresBancoData;
    verdict: string;
    notes: string;
  }) => void;
  onCancel: () => void;
  saving: boolean;
};

export function InjetoresBancoForm({
  sectionId,
  initial,
  onSave,
  onCancel,
  saving,
}: InjetoresBancoFormProps) {
  const [title, setTitle] = useState(initial?.title ?? testTypeLabels.injetores_banco);
  const [data, setData] = useState<InjetoresBancoData>(initial?.data ?? emptyInjetoresBancoData());
  const [verdict, setVerdict] = useState(initial?.verdict ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const updateInjector = (
    index: number,
    field: keyof InjetorItem,
    value: string,
  ) => {
    setData((prev) => ({
      ...prev,
      injectors: prev.injectors.map((inj, i) =>
        i === index ? { ...inj, [field]: value } : inj,
      ),
    }));
  };

  const addInjector = () => {
    setData((prev) => ({
      ...prev,
      injectors: [
        ...prev.injectors,
        { number: prev.injectors.length + 1, value: "", sprayPattern: "OK" },
      ],
    }));
  };

  const removeInjector = (index: number) => {
    setData((prev) => ({
      ...prev,
      injectors: prev.injectors.filter((_, i) => i !== index),
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Ferramenta</label>
            <input
              type="text"
              value={data.tool}
              onChange={(e) => setData((prev) => ({ ...prev, tool: e.target.value }))}
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Pulsos</label>
            <input
              type="number"
              inputMode="numeric"
              value={data.pulsos}
              onChange={(e) => setData((prev) => ({ ...prev, pulsos: e.target.value }))}
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
              <option value="ml">ml</option>
              <option value="cc">cc</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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

        <div className="grid grid-cols-2 gap-3">
          <PhotoCaptureButton
            sectionId={sectionId}
            label="Foto ANTES"
            mediaLabel="Injetores - antes"
            previewUrl={data.fotoAntesPreviewUrl}
            onUploaded={(mediaId, previewUrl) =>
              setData((prev) => ({
                ...prev,
                fotoAntesMediaId: mediaId,
                fotoAntesPreviewUrl: previewUrl,
              }))
            }
          />
          <PhotoCaptureButton
            sectionId={sectionId}
            label="Foto DEPOIS"
            mediaLabel="Injetores - depois"
            previewUrl={data.fotoDepoisPreviewUrl}
            onUploaded={(mediaId, previewUrl) =>
              setData((prev) => ({
                ...prev,
                fotoDepoisMediaId: mediaId,
                fotoDepoisPreviewUrl: previewUrl,
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Injetores</label>

          {data.injectors.map((inj, index) => (
            <div key={index} className="flex items-center gap-2 rounded-xl border p-3">
              <span className="w-16 shrink-0 text-sm font-semibold">Inj. {inj.number}</span>
              <input
                type="number"
                inputMode="decimal"
                value={inj.value}
                onChange={(e) => updateInjector(index, "value", e.target.value)}
                placeholder={data.unit}
                className="h-11 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <select
                value={inj.sprayPattern}
                onChange={(e) => updateInjector(index, "sprayPattern", e.target.value as SprayPattern)}
                className="h-11 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="OK">Spray OK</option>
                <option value="IRREGULAR">Spray irregular</option>
                <option value="ENTUPIDO">Entupido</option>
                <option value="GOTEJANDO">Gotejando</option>
              </select>
              <Button type="button" variant="outline" onClick={() => removeInjector(index)}>
                Remover
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addInjector}>
            + Adicionar injetor
          </Button>
        </div>
      </div>
    </TestFormShell>
  );
}
