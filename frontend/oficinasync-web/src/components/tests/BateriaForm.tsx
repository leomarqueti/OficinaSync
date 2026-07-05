import { useState } from "react";
import { TestFormShell } from "./TestFormShell";
import type { BateriaData } from "./testTypes";
import { emptyBateriaData, testTypeLabels } from "./testTypes";

type BateriaFormProps = {
  initial?: { title: string; data: BateriaData; verdict: string; notes: string };
  onSave: (payload: {
    title: string;
    data: BateriaData;
    verdict: string;
    notes: string;
  }) => void;
  onCancel: () => void;
  saving: boolean;
};

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

export function BateriaForm({ initial, onSave, onCancel, saving }: BateriaFormProps) {
  const [title, setTitle] = useState(initial?.title ?? testTypeLabels.bateria);
  const [data, setData] = useState<BateriaData>(initial?.data ?? emptyBateriaData());
  const [verdict, setVerdict] = useState(initial?.verdict ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const updateField = (field: keyof BateriaData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Ferramenta</label>
            <input
              type="text"
              value={data.tool}
              onChange={(e) => updateField("tool", e.target.value)}
              placeholder="Ex: Doutor-IE"
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Resultado</label>
            <select
              value={data.resultado}
              onChange={(e) => updateField("resultado", e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione</option>
              <option value="APROVADA">Aprovada</option>
              <option value="INSPECAO">Necessita inspeção</option>
              <option value="REPROVADA">Reprovada</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Tensão de repouso (V)"
            value={data.tensaoRepouso}
            onChange={(v) => updateField("tensaoRepouso", v)}
          />
          <NumberField
            label="Tensão mín. na partida (V)"
            value={data.tensaoMinPartida}
            onChange={(v) => updateField("tensaoMinPartida", v)}
          />
          <NumberField
            label="Tensão máx. em carga (V)"
            value={data.tensaoMaxCarga}
            onChange={(v) => updateField("tensaoMaxCarga", v)}
          />
          <NumberField
            label="Queda de tensão (V)"
            value={data.quedaTensao}
            onChange={(v) => updateField("quedaTensao", v)}
          />
          <NumberField
            label="Temp. de arrefecimento (°C)"
            value={data.tempArrefecimento}
            onChange={(v) => updateField("tempArrefecimento", v)}
          />
        </div>
      </div>
    </TestFormShell>
  );
}
