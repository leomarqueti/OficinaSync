import { Button } from "@/components/ui/button";

type TestFormShellProps = {
  title: string;
  onTitleChange: (value: string) => void;
  verdict: string;
  onVerdictChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  children: React.ReactNode;
};

export function TestFormShell({
  title,
  onTitleChange,
  verdict,
  onVerdictChange,
  notes,
  onNotesChange,
  onSave,
  onCancel,
  saving,
  children,
}: TestFormShellProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Título do teste</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {children}

      <div className="space-y-2">
        <label className="text-sm font-medium">Veredito geral</label>
        <select
          value={verdict}
          onChange={(e) => onVerdictChange(e.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-64"
        >
          <option value="">Sem veredito ainda</option>
          <option value="approved">Aprovado</option>
          <option value="failed">Reprovado</option>
          <option value="inconclusive">Inconclusivo</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Observações</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Explique o que foi analisado neste teste..."
          className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="flex gap-2">
        <Button
          className="h-11 bg-lime-400 text-black hover:bg-lime-500"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar teste"}
        </Button>

        <Button className="h-11" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
