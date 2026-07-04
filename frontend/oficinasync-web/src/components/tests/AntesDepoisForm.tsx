import { useState } from "react";
import { PhotoCaptureButton } from "./PhotoCaptureButton";
import { TestFormShell } from "./TestFormShell";
import type { AntesDepoisData } from "./testTypes";
import { emptyAntesDepoisData, testTypeLabels } from "./testTypes";

type AntesDepoisFormProps = {
  sectionId: number;
  onSave: (payload: {
    title: string;
    data: AntesDepoisData;
    verdict: string;
    notes: string;
  }) => void;
  onCancel: () => void;
  saving: boolean;
};

/** Compara duas fotos lado a lado — usável em qualquer etapa (limpeza, reparo, pintura, etc). */
export function AntesDepoisForm({ sectionId, onSave, onCancel, saving }: AntesDepoisFormProps) {
  const [title, setTitle] = useState(testTypeLabels.antes_depois);
  const [data, setData] = useState<AntesDepoisData>(emptyAntesDepoisData());
  const [verdict, setVerdict] = useState("");
  const [notes, setNotes] = useState("");

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
        <div className="grid grid-cols-2 gap-3">
          <PhotoCaptureButton
            sectionId={sectionId}
            label="Foto ANTES"
            mediaLabel={`${title || "Antes e depois"} - antes`}
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
            mediaLabel={`${title || "Antes e depois"} - depois`}
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

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Descrição (opcional)
          </label>
          <textarea
            value={data.description}
            onChange={(e) => setData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Ex: limpeza do compartimento do motor"
            className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>
    </TestFormShell>
  );
}
