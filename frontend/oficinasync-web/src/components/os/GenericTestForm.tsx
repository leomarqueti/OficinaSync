import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TestFormShell } from "@/components/tests/TestFormShell";
import { componentTestTemplates } from "@/lib/testComponentTemplates";
import { TestHistoryPanel } from "./TestHistoryPanel";
import type { TestMeasurement, TestItem } from "./types";

const titleSuggestions = [
  "Teste de bateria",
  "Teste de compressão",
  "Teste de vazão dos bicos injetores",
  "Leitura de scanner",
  "Teste de bomba de combustível",
];

export type GenericTestPayload = {
  title: string;
  measurements: TestMeasurement[];
  verdict: string;
  notes: string;
};

type GenericTestFormProps = {
  /** Preenche o formulário pra edição de um teste existente. */
  initial?: TestItem;
  /** Veículo da OS atual — habilita o painel de histórico entre visitas. */
  carId?: number;
  onSave: (payload: GenericTestPayload) => void;
  onCancel: () => void;
  saving: boolean;
};

function cleanMeasurements(measurements: TestMeasurement[]) {
  return measurements
    .filter((m) => m.label.trim() !== "" || m.actual.trim() !== "")
    .map((m) => ({
      label: m.label.trim(),
      actual: m.actual.trim(),
      ...(m.expected?.trim() ? { expected: m.expected.trim() } : {}),
    }));
}

/** Formulário livre (título + linhas esperado/medido) pra qualquer teste
 *  que não tem UI dedicada. */
export function GenericTestForm({ initial, carId, onSave, onCancel, saving }: GenericTestFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [verdict, setVerdict] = useState<string>(initial?.verdict ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [measurements, setMeasurements] = useState<TestMeasurement[]>(
    initial?.measurements?.length
      ? initial.measurements.map((m) => ({
          label: m.label,
          expected: m.expected ?? "",
          actual: m.actual,
        }))
      : [{ label: "", expected: "", actual: "" }],
  );

  const updateRow = (index: number, field: keyof TestMeasurement, value: string) => {
    setMeasurements((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  const addRow = () =>
    setMeasurements((prev) => [...prev, { label: "", expected: "", actual: "" }]);

  const removeRow = (index: number) =>
    setMeasurements((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ label: "", expected: "", actual: "" }];
    });

  const applyTemplate = (template: (typeof componentTestTemplates)[number]) => {
    setTitle(template.title);
    setMeasurements(
      template.measurements.map((m) => ({
        label: m.label,
        expected: m.expected ?? "",
        actual: "",
      })),
    );
  };

  return (
    <TestFormShell
      title={title}
      onTitleChange={setTitle}
      verdict={verdict}
      onVerdictChange={setVerdict}
      notes={notes}
      onNotesChange={setNotes}
      onSave={() =>
        onSave({ title, measurements: cleanMeasurements(measurements), verdict, notes })
      }
      onCancel={onCancel}
      saving={saving}
    >
      {!initial && (
        <div className="flex flex-wrap gap-2">
          {titleSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setTitle(suggestion)}
              className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {!initial && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Testar um componente (alimentação/sinal já preenchidos)
          </label>
          <div className="flex flex-wrap gap-2">
            {componentTestTemplates.map((template) => (
              <button
                key={template.title}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-full border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs text-brand hover:bg-brand/10"
              >
                {template.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {carId !== undefined && title.trim() !== "" && (
        <TestHistoryPanel carId={carId} title={title} />
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Medições</label>
        {measurements.map((measurement, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              type="text"
              value={measurement.label}
              onChange={(e) => updateRow(index, "label", e.target.value)}
              placeholder="Ex: Tensão mínima"
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={measurement.expected ?? ""}
              onChange={(e) => updateRow(index, "expected", e.target.value)}
              placeholder="Esperado (opcional)"
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={measurement.actual}
              onChange={(e) => updateRow(index, "actual", e.target.value)}
              placeholder="Medido"
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="button" variant="outline" onClick={() => removeRow(index)}>
              Remover
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addRow}>
          + Adicionar linha
        </Button>
      </div>
    </TestFormShell>
  );
}
