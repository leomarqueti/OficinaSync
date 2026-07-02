import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TestFormShell } from "./TestFormShell";
import type { DtcCode, DtcStatus, LeituraDtcData } from "./testTypes";
import { emptyLeituraDtcData, testTypeLabels } from "./testTypes";

type LeituraDtcFormProps = {
  onSave: (payload: {
    title: string;
    data: LeituraDtcData;
    verdict: string;
    notes: string;
  }) => void;
  onCancel: () => void;
  saving: boolean;
};

export function LeituraDtcForm({ onSave, onCancel, saving }: LeituraDtcFormProps) {
  const [title, setTitle] = useState(testTypeLabels.leitura_dtc);
  const [data, setData] = useState<LeituraDtcData>(emptyLeituraDtcData());
  const [verdict, setVerdict] = useState("");
  const [notes, setNotes] = useState("");

  const updateDtc = (index: number, field: keyof DtcCode, value: string) => {
    setData((prev) => ({
      ...prev,
      dtcs: prev.dtcs.map((dtc, i) =>
        i === index ? { ...dtc, [field]: value } : dtc,
      ),
    }));
  };

  const addDtcRow = () => {
    setData((prev) => ({
      ...prev,
      dtcs: [
        ...prev.dtcs,
        { code: "", description: "", module: "", status: "confirmado" },
      ],
    }));
  };

  const removeDtcRow = (index: number) => {
    setData((prev) => ({
      ...prev,
      dtcs: prev.dtcs.filter((_, i) => i !== index),
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
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Scanner utilizado</label>
          <input
            type="text"
            value={data.scanner}
            onChange={(e) => setData((prev) => ({ ...prev, scanner: e.target.value }))}
            placeholder="Ex: Doutor-IE, Launch, THINKCAR"
            className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Códigos de falha</label>

          {data.dtcs.map((dtc, index) => (
            <div key={index} className="space-y-2 rounded-xl border p-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={dtc.code}
                  onChange={(e) => updateDtc(index, "code", e.target.value)}
                  placeholder="Código (ex: P0302)"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <select
                  value={dtc.status}
                  onChange={(e) => updateDtc(index, "status", e.target.value as DtcStatus)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="confirmado">Confirmado</option>
                  <option value="intermitente">Intermitente</option>
                  <option value="passado">Passado</option>
                  <option value="eliminado">Eliminado</option>
                </select>
              </div>

              <input
                type="text"
                value={dtc.description}
                onChange={(e) => updateDtc(index, "description", e.target.value)}
                placeholder="Descrição (ex: Falha de combustão no cilindro 2)"
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />

              <div className="flex gap-2">
                <input
                  type="text"
                  value={dtc.module}
                  onChange={(e) => updateDtc(index, "module", e.target.value)}
                  placeholder="Módulo (ex: Motor, ABS, Airbag)"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button type="button" variant="outline" onClick={() => removeDtcRow(index)}>
                  Remover
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addDtcRow}>
            + Adicionar código
          </Button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Sistemas verificados sem falhas
          </label>
          <input
            type="text"
            value={data.systemsOk}
            onChange={(e) => setData((prev) => ({ ...prev, systemsOk: e.target.value }))}
            placeholder="Ex: ABS, Airbag, Painel (separados por vírgula)"
            className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
    </TestFormShell>
  );
}
